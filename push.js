var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var uuid = require('node-uuid');
var context = require('rabbit.js').createContext('amqp://localhost');

var connection = process.env.CONNECTION || 'uber';
var jsonFile = process.argv[2] || 'data/input.js';
var push;

context.on('ready', function() {
  push = context.socket('PUSH');
  push.connect(connection, function() {
    pushRoutes(jsonFile);
  });
});

/**
 * [pushRoutes description]
 * @param  {[type]} jsonFile [description]
 * @return {[type]}          [description]
 */
function pushRoutes(jsonFile) {
  fs.readFileAsync(jsonFile)
  .then(function(results) {
    try {
      var routes = JSON.parse(results);

      routes.forEach(function(route) {
        route.uuid = uuid.v1();
        var message = JSON.stringify(route);
        console.log(message);
        console.log('-------')
        push.write(message);
      })
    } catch(err) {
      console.log('error:', err)
    }
  })
}
