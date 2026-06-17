module.exports = {
  SUCCESS: {
    code: 200,
    message: 'Success'
  },
  BAD_REQUEST: {
    code: 400,
    message: 'Invalid request'
  },
  UNAUTHORIZED: {
    code: 401,
    message: 'Unauthorized'
  },
  PHONE_ALREADY_EXISTS: {
    code: 1001,
    message: 'Phone number already exists'
  },
  INVALID_CREDENTIALS: {
    code: 1002,
    message: 'Invalid phone number or password'
  },
  SERVER_ERROR: {
    code: 500,
    message: 'Internal server error'
  }
};
