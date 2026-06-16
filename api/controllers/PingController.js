module.exports = {

  ping: function(req, res) {
    return res.status(200).json({
      err: 200,
      message: 'pong',
      data: {
        result: 'pong'
      }
    });
  }

};
