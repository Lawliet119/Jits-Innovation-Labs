/**
 * passwordService.js
 * 
 * @description :: A service module for handling password hashing and verification.
 */
var bcrypt = require('bcrypt');
var SALT_ROUNDS = 10;

module.exports = {
  /**
   * Hashes a raw password.
   * @param {string} password - The plain text password.
   * @returns {Promise<string>} The hashed password.
   */
  hash: async (password) => {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  /**
   * Verifies a raw password against a stored hash.
   * @param {string} password - The plain text password to verify.
   * @param {string} passwordHash - The stored bcrypt hash.
   * @returns {Promise<boolean>} True if the password matches, false otherwise.
   */
  verify: async (password, passwordHash) => {
    if (!passwordHash) {
      return false;
    }

    return bcrypt.compare(password, passwordHash);
  }
};
