module.exports = {
  transfer: async function(req, res) {
    var receiverPhone = (req.body.receiverPhone || '').trim();
    var amount = Number(req.body.amount);
    var note = typeof req.body.note === 'string' ? req.body.note.trim() : null;

    if (!receiverPhone || !Number.isSafeInteger(amount) || amount <= 0) {
      return res.error(respCode.INVALID_AMOUNT);
    }

    try {
      var result = await transferService.execute({
        senderCustomerId: req.session.customerId,
        receiverPhone: receiverPhone,
        amount: amount,
        note: note || null
      });

      return res.ok({
        transaction: {
          id: result.transaction.id,
          receiverPhone: result.receiverPhone,
          amount: result.transaction.amount,
          note: result.transaction.note,
          createdAt: result.transaction.createdAt
        },
        balance: result.balance
      });
    } catch (err) {
      var codeMap = {
        RECEIVER_NOT_FOUND: respCode.RECEIVER_NOT_FOUND,
        CANNOT_TRANSFER_TO_SELF: respCode.CANNOT_TRANSFER_TO_SELF,
        POCKET_NOT_FOUND: respCode.POCKET_NOT_FOUND,
        INSUFFICIENT_BALANCE: respCode.INSUFFICIENT_BALANCE,
        TRANSFER_FAILED: respCode.TRANSFER_FAILED
      };

      if (codeMap[err.code]) {
        return res.error(codeMap[err.code]);
      }

      sails.log.error(err);
      return res.serverError();
    }
  },

  history: async function(req, res) {
    try {
      var pocket = await Pocket.findOne({ customer: req.session.customerId });

      if (!pocket) {
        return res.error(respCode.POCKET_NOT_FOUND);
      }

      var transactions = await Transaction.find({
        or: [
          { fromPocket: pocket.id },
          { toPocket: pocket.id }
        ]
      })
      .populate('fromCustomer')
      .populate('toCustomer')
      .sort('createdAt DESC');

      var history = transactions.map((transaction) => {
        var isOutgoing = transaction.fromPocket === pocket.id;
        var counterparty = isOutgoing ? transaction.toCustomer : transaction.fromCustomer;

        return {
          id: transaction.id,
          direction: isOutgoing ? 'OUT' : 'IN',
          counterpartyPhone: counterparty ? counterparty.phone : null,
          amount: transaction.amount,
          note: transaction.note,
          status: transaction.status,
          createdAt: transaction.createdAt
        };
      });

      return res.ok({ transactions: history });
    } catch (err) {
      sails.log.error(err);
      return res.serverError();
    }
  }
};
