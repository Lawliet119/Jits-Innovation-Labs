# Mini-Mini-Wallet

Week 1 Sails project: a small wallet backed by MongoDB with session authentication,
money transfer, balance lookup, and transaction history.

## Run locally

Requirements: Node.js, npm, and MongoDB running on port `27017`.

```powershell
npm install
node app.js
```

Open `http://localhost:1337`.

The local datastore can be overridden in `config/local.js`:

```js
module.exports = {
  datastores: {
    default: {
      adapter: 'sails-mongo',
      url: 'mongodb://localhost:27017/Jits_Mini_Wallet'
    }
  }
};
```

## API

All endpoints use `POST`. Every response has HTTP status 200 and follows
`{ err, message, ...data }`; `err === 200` means success.

| Endpoint | Access | Purpose |
| --- | --- | --- |
| `/api/v1/auth/register` | Public | Create customer and initial 1,000,000 VND pocket |
| `/api/v1/auth/login` | Public | Start authenticated session |
| `/api/v1/auth/logout` | Authenticated | End session |
| `/api/v1/pocket/balance` | Authenticated | Read current balance |
| `/api/v1/transaction/transfer` | Authenticated | Transfer to another phone number |
| `/api/v1/transaction/history` | Authenticated | Read incoming and outgoing transfers |

Transfer request:

```json
{
  "receiverPhone": "0901234567",
  "amount": 125000,
  "note": "Lunch"
}
```

## Transfer integrity

The sender debit uses one atomic MongoDB update with `balance >= amount` and
`$inc`, preventing concurrent requests from spending the same balance. Credit or
history failures trigger compensating updates so the transfer does not remain
half-applied on a standalone local MongoDB instance.

## Debug

Use the `Debug Sails` launch configuration in VSCode or Antigravity. Set
breakpoints in a controller/service and press `F5`.
