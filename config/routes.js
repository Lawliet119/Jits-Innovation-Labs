/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Blueprints are disabled, so every endpoint must be declared here.
 */

module.exports.routes = {

  // Frontend page.
  'GET /': 'ClicksController.index',

  // API routes use POST and return the project response envelope.
  'POST /api/v1/ping': 'PingController.ping',

};
