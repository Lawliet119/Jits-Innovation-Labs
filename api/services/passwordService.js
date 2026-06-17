var bcrypt = require('bcrypt');
var SALT_ROUNDS = 10;

module.exports = {
  hash: async (password) => {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  verify: async (password, passwordHash) => {
    if (!passwordHash) {
      return false;
    }

    return bcrypt.compare(password, passwordHash);
  }
};
