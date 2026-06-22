/**
 * PocketController.js
 *
 * @description :: Handles operations related to the customer's pocket, such as retrieving balances.
 */
module.exports = {
  /**
   * Retrieves the current balance for the authenticated customer's pocket.
   */
  balance: async function(req, res) {
    try {
      // Find the pocket associated with the current session's customer ID
      var pocket = await Pocket.findOne({
        customer: req.session.customerId
      });

      // Handle the case where the pocket does not exist
      if (!pocket) {
        return res.error(respCode.POCKET_NOT_FOUND);
      }

      // Return the pocket details
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
