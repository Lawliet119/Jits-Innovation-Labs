/**
 * Transaction.js
 *
 * @description :: Manages transaction history records (e.g., transfers).
 */
module.exports = {
  attributes: {
    // The type of transaction, defaults to 'transfer'
    type: {
      type: 'string',
      isIn: ['transfer'],
      defaultsTo: 'transfer'
    },
    // The transaction amount
    amount: {
      type: 'number',
      required: true
    },
    // The customer initiating the transaction
    fromCustomer: {
      model: 'customer',
      required: true
    },
    // The customer receiving the transaction
    toCustomer: {
      model: 'customer',
      required: true
    },
    // The pocket the funds are debited from
    fromPocket: {
      model: 'pocket',
      required: true
    },
    // The pocket the funds are credited to
    toPocket: {
      model: 'pocket',
      required: true
    },
    // The current status of the transaction
    status: {
      type: 'string',
      isIn: ['success', 'failed'],
      defaultsTo: 'success'
    },
    // Optional note or description for the transaction
    note: {
      type: 'string',
      allowNull: true
    }
  }
};
