module.exports = function serverError(data) {
  var res = this.res;
  var payload = Object.assign({
    err: respCode.SERVER_ERROR.code,
    message: respCode.SERVER_ERROR.message
  }, data || {});

  return res.status(200).json(payload);
};
