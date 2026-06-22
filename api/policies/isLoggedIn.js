module.exports = async function isLoggedIn(req, res, proceed) {
  if (req.session && req.session.customerId) {
    return proceed();
  }

  return res.error(respCode.UNAUTHORIZED);
};
