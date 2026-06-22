module.exports = {
  register: async function(req, res) {
    try {
      var phone = (req.body.phone || '').trim();
      var password = req.body.password;

      if (!phone || !password) {
        return res.badRequest();
      }

      var existedCustomer = await Customer.findOne({ phone: phone });
      if (existedCustomer) {
        return res.error(respCode.PHONE_ALREADY_EXISTS);
      }

      var customer = await Customer.create({
        phone: phone,
        passwordHash: await passwordService.hash(password)
      }).fetch();

      var pocket = await Pocket.create({
        customer: customer.id,
        balance: 1000000
      }).fetch();

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

  login: async function(req, res) {
    try {
      var phone = (req.body.phone || '').trim();
      var password = req.body.password;

      if (!phone || !password) {
        return res.badRequest();
      }

      var customer = await Customer.findOne({ phone: phone });
      if (!customer) {
        return res.error(respCode.INVALID_CREDENTIALS);
      }

      var isValidPassword = await passwordService.verify(password, customer.passwordHash);
      if (!isValidPassword) {
        return res.error(respCode.INVALID_CREDENTIALS);
      }

      req.session.customerId = customer.id;

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

  logout: async function(req, res) {
    req.session.customerId = null;
    return res.ok();
  }
};
