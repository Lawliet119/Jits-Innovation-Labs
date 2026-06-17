module.exports = {
  attributes: {
    type: {
      type: 'string',
      isIn: ['transfer'],
      defaultsTo: 'transfer'
    },
    amount: {
      type: 'number',
      required: true
    },
    fromCustomer: {
      model: 'customer',
      required: true
    },
    toCustomer: {
      model: 'customer',
      required: true
    },
    fromPocket: {
      model: 'pocket',
      required: true
    },
    toPocket: {
      model: 'pocket',
      required: true
    },
    status: {
      type: 'string',
      isIn: ['success', 'failed'],
      defaultsTo: 'success'
    },
    note: {
      type: 'string',
      allowNull: true
    }
  }
};
