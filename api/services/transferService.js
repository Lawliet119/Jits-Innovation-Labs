var ObjectId = require('mongodb').ObjectId;

var transferError = function(code) {
  var err = new Error(code);
  err.code = code;
  return err;
};

module.exports = {
  execute: async function(options) {
    var receiver = await Customer.findOne({ phone: options.receiverPhone });

    if (!receiver) {
      throw transferError('RECEIVER_NOT_FOUND');
    }

    if (receiver.id === options.senderCustomerId) {
      throw transferError('CANNOT_TRANSFER_TO_SELF');
    }

    var pockets = await Promise.all([
      Pocket.findOne({ customer: options.senderCustomerId }),
      Pocket.findOne({ customer: receiver.id })
    ]);
    var senderPocket = pockets[0];
    var receiverPocket = pockets[1];

    if (!senderPocket || !receiverPocket) {
      throw transferError('POCKET_NOT_FOUND');
    }

    var db = sails.getDatastore().manager;
    var pocketCollection = db.collection(Pocket.tableName);
    var now = Date.now();
    var debitResult = await pocketCollection.updateOne({
      _id: new ObjectId(senderPocket.id),
      balance: { $gte: options.amount }
    }, {
      $inc: { balance: -options.amount },
      $set: { updatedAt: now }
    });

    if (debitResult.modifiedCount !== 1) {
      throw transferError('INSUFFICIENT_BALANCE');
    }

    try {
      var creditResult = await pocketCollection.updateOne({
        _id: new ObjectId(receiverPocket.id)
      }, {
        $inc: { balance: options.amount },
        $set: { updatedAt: now }
      });

      if (creditResult.modifiedCount !== 1) {
        throw transferError('TRANSFER_FAILED');
      }

      try {
        var transaction = await Transaction.create({
          type: 'transfer',
          amount: options.amount,
          fromCustomer: options.senderCustomerId,
          toCustomer: receiver.id,
          fromPocket: senderPocket.id,
          toPocket: receiverPocket.id,
          status: 'success',
          note: options.note
        }).fetch();

        return {
          transaction: transaction,
          receiverPhone: receiver.phone,
          balance: senderPocket.balance - options.amount
        };
      } catch (err) {
        await pocketCollection.updateOne({ _id: new ObjectId(receiverPocket.id) }, {
          $inc: { balance: -options.amount },
          $set: { updatedAt: Date.now() }
        });
        throw err;
      }
    } catch (err) {
      await pocketCollection.updateOne({ _id: new ObjectId(senderPocket.id) }, {
        $inc: { balance: options.amount },
        $set: { updatedAt: Date.now() }
      });
      throw err;
    }
  }
};
