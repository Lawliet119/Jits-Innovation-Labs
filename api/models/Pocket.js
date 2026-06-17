module.exports = {
  attributes: {
    balance: {
      type: 'number',
      required: true
    },
    customer: {
      model: 'customer',
      required: true,
      unique: true
    }
  }
};
