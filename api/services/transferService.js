/**
 * transferService.js
 *
 * @description :: Core service logic for handling funds transfers.
 * It utilizes MongoDB distributed transactions to ensure strict ACID compliance.
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

module.exports = {
  /**
   * Executes a fund transfer between two customers.
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

    try {
      // Begin the actual database transaction (Real Transaction)
      session.startTransaction();

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
      
      // 7. Commit the transaction if all operations succeed
      await session.commitTransaction();

      // Normalize the ID format prior to returning the result
      var transaction = Object.assign({}, transactionDoc, { id: transactionResult.insertedId.toString() });
      delete transaction._id;

      return {
        transaction: transaction,
        receiverPhone: receiver.phone,
        balance: senderPocket.balance - options.amount // Provide the updated balance
      };
    } catch (err) {
      // Roll back all uncommitted operations upon encountering an error
      await session.abortTransaction();
      throw err;
    } finally {
      // Ensure the session is terminated to release resources
      await session.endSession();
    }
  }
};
