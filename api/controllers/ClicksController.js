module.exports = {

  index: function(req, res) {
    return res.view('pages/homepage', { layout: false });
  }

};
