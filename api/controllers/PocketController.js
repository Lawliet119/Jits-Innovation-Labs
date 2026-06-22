module.exports = {
  balance: async function(req, res) {
    try {
      var pocket = await Pocket.findOne({
        customer: req.session.customerId
      });

      if (!pocket) {
        return res.error(respCode.POCKET_NOT_FOUND);
      }

      return res.ok({
        pocket: {
          id: pocket.id,
          balance: pocket.balance
        }
      });
    } catch (err) {
      sails.log.error(err);
      return res.serverError();
    }
  }
};
