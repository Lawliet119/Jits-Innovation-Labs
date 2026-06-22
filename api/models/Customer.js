/**
 * Customer.js
 *
 * @description :: A model definition. Manages customer information.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
module.exports = {
  attributes: {
    // Customer's phone number, required and must be unique
    phone: {
      type: 'string',
      required: true,
      unique: true
    },
    // The hashed representation of the customer's password
    passwordHash: {
      type: 'string',
      required: true
    },
    // One-to-one relationship with the Pocket model
    pocket: {
      collection: 'pocket',
      via: 'customer'
    }
  }
};
