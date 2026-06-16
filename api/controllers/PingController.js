module.exports = {

  index: function(req, res) {
    return res.view('pages/homepage', { layout: false });
  },

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
