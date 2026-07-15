/**
 * transferService.js
 *
 * @description :: Core service logic for handling funds transfers.
 * It utilizes MongoDB distributed transactions with session.withTransaction()
 * to ensure strict ACID compliance and automatic retry on TransientTransactionError.
 */
var ObjectId = require('mongodb').ObjectId;

/**
 * Utility function to instantiate custom service errors.
 * @param {string} code - The error identifier.
 * @returns {Error} The generated error object.
 */
var transferError = function(code) {
  var err = new Error(code);
  err.code = code;
  return err;
};

/**
 * Maximum number of receivers allowed in a single bulk transfer request.
 */
var BULK_TRANSFER_LIMIT = 50;

module.exports = {
  /**
   * Executes a fund transfer between two customers.
   * Uses session.withTransaction() for automatic retry on TransientTransactionError,
   * which is critical for handling write conflicts on hot documents.
   * @param {Object} options - The transfer parameters.
   * @returns {Promise<Object>} An object containing the transaction data and the new balance.
   */
  execute: async function(options) {
    // 1. Verify the existence of the receiver
    var receiver = await Customer.findOne({ phone: options.receiverPhone });

    if (!receiver) {
      throw transferError('RECEIVER_NOT_FOUND');
    }

    // 2. Prevent transfers to the sender's own account
    if (receiver.id === options.senderCustomerId) {
      throw transferError('CANNOT_TRANSFER_TO_SELF');
    }

    // 3. Fetch the pocket instances for both the sender and the receiver concurrently
    var pockets = await Promise.all([
      Pocket.findOne({ customer: options.senderCustomerId }),
      Pocket.findOne({ customer: receiver.id })
    ]);
    var senderPocket = pockets[0];
    var receiverPocket = pockets[1];

    if (!senderPocket || !receiverPocket) {
      throw transferError('POCKET_NOT_FOUND');
    }

    // Access the native MongoDB Client via the Sails datastore
    var db = sails.getDatastore().manager;
    var client = db.client;

    // Initialize a new MongoDB session for the transaction
    var session = client.startSession();

    // Result container — withTransaction callback cannot return a value directly,
    // so we capture it in an outer-scope variable.
    var result = null;

    try {
      // withTransaction() automatically handles:
      // - Calling startTransaction()
      // - Retrying the callback on TransientTransactionError (e.g. write conflicts on hot documents)
      // - Retrying commitTransaction() on UnknownTransactionCommitResult
      // - Calling abortTransaction() on non-retryable errors
      await session.withTransaction(async () => {
        var pocketCollection = db.collection(Pocket.tableName);
        var now = Date.now();

        // 4. Debit the sender's pocket (ensure the balance is greater than or equal to the amount)
        var debitResult = await pocketCollection.updateOne({
          _id: new ObjectId(senderPocket.id),
          balance: { $gte: options.amount }
        }, {
          $inc: { balance: -options.amount },
          $set: { updatedAt: now }
        }, { session });

        // If no document was modified, the balance condition failed
        if (debitResult.modifiedCount !== 1) {
          throw transferError('INSUFFICIENT_BALANCE');
        }

        // 5. Credit the receiver's pocket
        var creditResult = await pocketCollection.updateOne({
          _id: new ObjectId(receiverPocket.id)
        }, {
          $inc: { balance: options.amount },
          $set: { updatedAt: now }
        }, { session });

        // Throw an error if the receiver's update fails
        if (creditResult.modifiedCount !== 1) {
          throw transferError('TRANSFER_FAILED');
        }

        // 6. Record the transaction history using the native driver to maintain session context
        var transactionCollection = db.collection(Transaction.tableName);
        var transactionDoc = {
          type: 'transfer',
          amount: options.amount,
          fromCustomer: options.senderCustomerId,
          toCustomer: receiver.id,
          fromPocket: senderPocket.id,
          toPocket: receiverPocket.id,
          status: 'success',
          note: options.note,
          createdAt: now,
          updatedAt: now
        };

        var transactionResult = await transactionCollection.insertOne(transactionDoc, { session });

        // Normalize the ID format prior to returning the result
        var transaction = Object.assign({}, transactionDoc, { id: transactionResult.insertedId.toString() });
        delete transaction._id;

        result = {
          transaction: transaction,
          receiverPhone: receiver.phone,
          balance: senderPocket.balance - options.amount
        };
      });

      return result;
    } finally {
      // Ensure the session is terminated to release resources
      await session.endSession();
    }
  },

  /**
   * Executes a bulk fund transfer from one sender to multiple receivers.
   * All operations are performed within a single MongoDB transaction.
   * If any individual credit fails, the entire batch is rolled back.
   *
   * @param {Object} options - The bulk transfer parameters.
   * @param {string} options.senderCustomerId - The ID of the sender.
   * @param {Array<Object>} options.items - Array of { receiverPhone, amount, note }.
   * @returns {Promise<Object>} An object containing the transaction records and the new balance.
   */
  executeBulk: async function(options) {
    var items = options.items;

    // 1. Validate and resolve all receiver phones before opening a transaction
    var receiverPhones = items.map(function(item) { return item.receiverPhone; });
    var receivers = await Customer.find({ phone: { in: receiverPhones } });

    // Build a phone-to-customer map for quick lookup
    var receiverMap = {};
    receivers.forEach(function(r) {
      receiverMap[r.phone] = r;
    });

    // Check all receivers exist
    for (var i = 0; i < items.length; i++) {
      if (!receiverMap[items[i].receiverPhone]) {
        var notFoundErr = transferError('RECEIVER_NOT_FOUND');
        notFoundErr.receiverPhone = items[i].receiverPhone;
        throw notFoundErr;
      }
      // Prevent transfers to self
      if (receiverMap[items[i].receiverPhone].id === options.senderCustomerId) {
        throw transferError('CANNOT_TRANSFER_TO_SELF');
      }
    }

    // 2. Calculate the total amount required
    var totalAmount = 0;
    for (var j = 0; j < items.length; j++) {
      totalAmount += items[j].amount;
    }

    // 3. Fetch the sender's pocket
    var senderPocket = await Pocket.findOne({ customer: options.senderCustomerId });
    if (!senderPocket) {
      throw transferError('POCKET_NOT_FOUND');
    }

    // 4. Fetch all receiver pockets concurrently
    var receiverCustomerIds = items.map(function(item) {
      return receiverMap[item.receiverPhone].id;
    });
    var receiverPockets = await Pocket.find({ customer: { in: receiverCustomerIds } });

    // Build a customer-to-pocket map
    var pocketMap = {};
    receiverPockets.forEach(function(p) {
      pocketMap[p.customer] = p;
    });

    // Check all receiver pockets exist
    for (var k = 0; k < items.length; k++) {
      var receiverId = receiverMap[items[k].receiverPhone].id;
      if (!pocketMap[receiverId]) {
        throw transferError('POCKET_NOT_FOUND');
      }
    }

    // Access the native MongoDB Client via the Sails datastore
    var db = sails.getDatastore().manager;
    var client = db.client;
    var session = client.startSession();

    var result = null;

    try {
      await session.withTransaction(async () => {
        var pocketCollection = db.collection(Pocket.tableName);
        var transactionCollection = db.collection(Transaction.tableName);
        var now = Date.now();

        // 5. Debit the sender's pocket for the total amount in one atomic operation
        //    This reduces hot document contention: only 1 write to the sender pocket
        var debitResult = await pocketCollection.updateOne({
          _id: new ObjectId(senderPocket.id),
          balance: { $gte: totalAmount }
        }, {
          $inc: { balance: -totalAmount },
          $set: { updatedAt: now }
        }, { session });

        if (debitResult.modifiedCount !== 1) {
          throw transferError('INSUFFICIENT_BALANCE');
        }

        // 6. Credit each receiver and record each transaction
        var transactions = [];

        for (var idx = 0; idx < items.length; idx++) {
          var item = items[idx];
          var receiver = receiverMap[item.receiverPhone];
          var receiverPocket = pocketMap[receiver.id];

          // Credit the receiver's pocket
          var creditResult = await pocketCollection.updateOne({
            _id: new ObjectId(receiverPocket.id)
          }, {
            $inc: { balance: item.amount },
            $set: { updatedAt: now }
          }, { session });

          if (creditResult.modifiedCount !== 1) {
            throw transferError('TRANSFER_FAILED');
          }

          // Record the transaction
          var transactionDoc = {
            type: 'transfer',
            amount: item.amount,
            fromCustomer: options.senderCustomerId,
            toCustomer: receiver.id,
            fromPocket: senderPocket.id,
            toPocket: receiverPocket.id,
            status: 'success',
            note: item.note || null,
            createdAt: now,
            updatedAt: now
          };

          var txResult = await transactionCollection.insertOne(transactionDoc, { session });

          var transaction = Object.assign({}, transactionDoc, { id: txResult.insertedId.toString() });
          delete transaction._id;

          transactions.push({
            id: transaction.id,
            receiverPhone: item.receiverPhone,
            amount: transaction.amount,
            note: transaction.note,
            createdAt: transaction.createdAt
          });
        }

        result = {
          transactions: transactions,
          totalAmount: totalAmount,
          balance: senderPocket.balance - totalAmount
        };
      });

      return result;
    } finally {
      await session.endSession();
    }
  }
};
