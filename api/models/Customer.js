module.exports = {
  attributes: {
    phone: {
      type: 'string',
      required: true,
      unique: true
    },
    passwordHash: {
      type: 'string',
      required: true
    },
    pocket: {
      collection: 'pocket',
      via: 'customer'
    }
  }
};
