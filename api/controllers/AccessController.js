/**
 * AccessController.js
 *
 * @description :: Handles user authentication including registration, login, and logout operations.
 */
module.exports = {
  /**
   * Registers a new customer account and initializes their pocket.
   */
  register: async function(req, res) {
    try {
      var phone = (req.body.phone || '').trim();
      var password = req.body.password;

      // Validate input parameters
      if (!phone || !password) {
        return res.badRequest();
      }

      // Check if the phone number is already registered
      var existedCustomer = await Customer.findOne({ phone: phone });
      if (existedCustomer) {
        return res.error(respCode.PHONE_ALREADY_EXISTS);
      }

      // Create the new customer with a hashed password
      var customer = await Customer.create({
        phone: phone,
        passwordHash: await passwordService.hash(password)
      }).fetch();

      // Initialize the customer's pocket with a default balance of 1,000,000
      var pocket = await Pocket.create({
        customer: customer.id,
        balance: 1000000
      }).fetch();

      // Return the created customer and pocket information
      return res.ok({
        customer: {
          id: customer.id,
          phone: customer.phone
        },
        pocket: {
          id: pocket.id,
          balance: pocket.balance
        }
      });
    } catch (err) {
      sails.log.error(err);
      return res.serverError();
    }
  },

  /**
   * Authenticates a customer and establishes a session.
   */
  login: async function(req, res) {
    try {
      var phone = (req.body.phone || '').trim();
      var password = req.body.password;

      // Validate input parameters
      if (!phone || !password) {
        return res.badRequest();
      }

      // Look up the customer by phone number
      var customer = await Customer.findOne({ phone: phone });
      if (!customer) {
        return res.error(respCode.INVALID_CREDENTIALS);
      }

      // Verify the provided password against the stored hash
      var isValidPassword = await passwordService.verify(password, customer.passwordHash);
      if (!isValidPassword) {
        return res.error(respCode.INVALID_CREDENTIALS);
      }

      // Store the customer ID in the session to maintain authentication state
      req.session.customerId = customer.id;

      // Return the authenticated customer's information
      return res.ok({
        customer: {
          id: customer.id,
          phone: customer.phone
        }
      });
    } catch (err) {
      sails.log.error(err);
      return res.serverError();
    }
  },

  /**
   * Destroys the current customer's session.
   */
  logout: async function(req, res) {
    // Clear the customer ID from the session
    req.session.customerId = null;
    return res.ok();
  }
};
