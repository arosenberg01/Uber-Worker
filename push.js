var config = require('./config');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var uuid = require('node-uuid');
var input = process.argv[2] || 'data/input.js';
var context = require('rabbit.js').createContext(config.broker);
var push;

context.on('ready', function() {
  push = context.socket('PUSH');
  push.connect(config.connection, function() {
    pushRoutes(input);
  });
});

/**
 * Attempt to read file contains array of Uber route tasks and enqueue in worker queue with timestamped uuids.
 * @param  {string} input - Name of file
 */
function pushRoutes(input) {
  fs.readFileAsync(input)
  .then(function(results) {
    try {
      var routes = JSON.parse(results);

      routes.forEach(function(route) {
        route.uuid = uuid.v1();
        var message = JSON.stringify(route);
        push.write(message);
        console.log('[x] message sent:', route.uuid);
      })
    } catch(err) {
      console.log('error:', err)
    }
  })
}
