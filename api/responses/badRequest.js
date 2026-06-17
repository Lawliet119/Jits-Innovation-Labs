module.exports = function badRequest(data) {
  var res = this.res;
  var payload = Object.assign({
    err: respCode.BAD_REQUEST.code,
    message: respCode.BAD_REQUEST.message
  }, data || {});

  return res.status(200).json(payload);
};
