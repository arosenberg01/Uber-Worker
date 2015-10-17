var config = require('./config');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'))
var getEstimates = require('./worker/main');
var output = process.argv[2] || 'data/output.js';
var context = require('rabbit.js').createContext(config.broker);

context.on('ready', function() {
  var sub = context.socket('PULL');
  sub.setEncoding('utf8');
  sub.connect(config.connection, function() {

    sub.on('data', function(data) {
      console.log('[x] message: received');
      console.log(data);
      addRoute(data, output)
    });

  });
});

/**
 * Promisified version of JSON.parse
 */
function jsonPromise(json) {
  return new Promise(function(resolve, reject) {
    try {
      resolve(JSON.parse(json));
    } catch(err) {
      reject(err);
    }
  });
}

/**
 * Attempts to retriever Uber options for given destination and append results to output file. Appends successful result or error message to 'output' file
 * @param {Object} locations - object containing 'origin' and 'destination' keys for Uber route lookup. Values can be string address \
 * or lat and long in format: { longitude: '-122.449571', latitude: '37.7107389' }
 * @param {string} - Output file to append result of tasks to
 */
function addRoute(locations, output) {
  var payload;
  jsonPromise(locations)
  .then(function(params) {
    payload = params;
    return getEstimates(params.origin, params.destination)
  })
  .then(function(results) {
    results.uuid = payload.uuid;
    return JSON.stringify(results) + '\n';
  })
  .then(function(str) {
    return fs.appendFileAsync(output, str)
  })
  .then(function() {
    console.log('Route saved');
  })
  .catch(function(err){
    var invalid = JSON.stringify({"error": "invalid input", "uuid": payload.uuid}) + ',\n';
    return fs.appendFileAsync('output.js', invalid)
  })
  .catch(function(mistake) {
    console.error("Could not append error message:", mistake, " from task:", payload.uuid);
  })
}



