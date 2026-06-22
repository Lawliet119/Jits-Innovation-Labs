/**
 * respCode.js
 * 
 * @description :: Defines standard response codes and messages for the API.
 */
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
  POCKET_NOT_FOUND: {
    code: 2001,
    message: 'Pocket not found'
  },
  INVALID_AMOUNT: {
    code: 3001,
    message: 'Transfer amount must be a positive integer'
  },
  RECEIVER_NOT_FOUND: {
    code: 3002,
    message: 'Receiver not found'
  },
  CANNOT_TRANSFER_TO_SELF: {
    code: 3003,
    message: 'Cannot transfer to yourself'
  },
  INSUFFICIENT_BALANCE: {
    code: 3004,
    message: 'Insufficient balance'
  },
  TRANSFER_FAILED: {
    code: 3005,
    message: 'Transfer failed'
  },
  SERVER_ERROR: {
    code: 500,
    message: 'Internal server error'
  }
};
