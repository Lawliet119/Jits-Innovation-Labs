
module.exports = function defineCustomHook(sails) {

  return {

    initialize: async function () {
      sails.log.info('Initializing project hook... (`api/hooks/custom/`)');
    },

    routes: {
      before: {
        '/*': {
          skipAssets: true,
          fn: async function (req, res, next) {
            return next();
          }
        }
      }
    }

  };

};
