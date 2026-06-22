/**
 * Pocket.js
 *
 * @description :: Manages customer pocket (wallet) information and balances.
 */
module.exports = {
  attributes: {
    // Current available balance in the pocket
    balance: {
      type: 'number',
      required: true
    },
    // The customer ID associated with this pocket (one-to-one relationship)
    customer: {
      model: 'customer',
      required: true,
      unique: true
    }
  }
};
