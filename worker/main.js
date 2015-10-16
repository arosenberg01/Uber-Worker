var geocoder = require('geocoder');
var async = require('async');
var moment = require('moment');
var _ = require('underscore');
var Promise = require('bluebird');

var getEstimates = require('./uber.js');

/**
 * Placeholder function to pass to async.parallel tasks
 * @param  {*} item - Value to be automaticaly returned by inner function
 * @return {function} - Anonymous function that will return "item" argument
 */
function noop(item) {
  return function(cb) {
    cb(null, item)
  }
}

/**
 * Wrapper function used to build async.parallels tasks with a location and promisifed geocoder function
 * @param  {string|Object} location - Either a string address or long and lat coordinates: { longitude: '-122.449571', latitude: '37.7107389' }
 * @param  {function} func - Function used to convert either address --> coordinates or coordinates --> address
 * @return {function} - Anonymous function to be inserted into async.parallel tasks
 */
function wrapper(location, func) {
  return function(cb) {
    func(location)
    .then(function(coordinates) {
      cb(null, coordinates)
    })
    .catch(function(err) {
      cb(err, null);
    })
  }
}

/**
 * Create gecoding tasks from input origins and destinations
 * @param  {(string|string{})} origin - string address or object in the format: { longitude: '-122.449571', latitude: '37.7107389' }
 * @param  {(string|string{})} destination - string address or object in the format: { longitude: '-122.449571', latitude: '37.7107389' }
 * @return {Array} tasks - array of tasks to be executed by async.parallel
 */
function createTasks(origin, destination) {
  var tasks = [];

  // If origin is string, assume address format
  if (typeof origin === 'string') {
    tasks.push(wrapper(origin, convertAddress))
    tasks.push(noop(origin))
  // Else, assume coordinates object format
  } else {
    tasks.push(noop(origin))
    tasks.push(wrapper(origin, convertCoordinates))
  }

  // If destination is string, assume address format
  if (typeof destination === 'string') {
    tasks.push(wrapper(destination, convertAddress))
    tasks.push(noop(destination))
  // Else, assume coordinate object format
  } else {
    tasks.push(noop(destination))
    tasks.push(wrapper(destination, convertCoordinates))
  }

  return tasks;
}

/**
 * Converts address to latitude and longtiude
 * @param  {string} address - Address to be converted
 * @return {Object} - The lat and long of address in format: { longitude: '-122.449571', latitude: '37.7107389' }
 */
function convertAddress(address) {
  return new Promise(function(resolve, reject) {
    geocoder.geocode(address, function(err, data) {
      if (err || !data.results[0]) {
        console.log('error geocoding:', err)
        reject(err);
      } else {

        var isProbablyWrong = _.contains(data.results[0].types, 'subpremise');
        if (isProbablyWrong) {
          reject(err);
        } else {
          var coordinates = data.results[0].geometry;
          var results = {
            longitude: coordinates.location.lng.toString(),
            latitude: coordinates.location.lat.toString()
          }
          resolve(results);
        }
      }
    });
  });
}

/**
 * Converts longitude and latitude coordinates to address
 * @param  {Object} - The lat and long of a location in format: { longitude: '-122.449571', latitude: '37.7107389' }
 * @return {string} - The address of the given coordinates
 */
function convertCoordinates(coordinates) {
  return new Promise(function(resolve, reject) {
    geocoder.reverseGeocode(Number(coordinates.latitude), Number(coordinates.longitude), function(err, data) {
      if (err) {
        reject(err)
      } else {
        var address = data.results[0].formatted_address;
        resolve(address)
      }
    });
  });
}


/**
 * [formatLocations description]
 * @param  {[type]} tasks [description]
 * @return {[type]}       [description]
 */
function formatLocations(tasks) {
  return new Promise(function(resolve, reject) {
    async.parallel(tasks, function(err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    })
  });
}


/**
 * [getUberOptions description]
 * @param  {[type]} origin      [description]
 * @param  {[type]} destination [description]
 * @return {[type]}             [description]
 */
function getUberOptions(origin, destination) {
  return new Promise (function(resolve, reject) {
    var results = {};
    var geocodeTasks = createTasks(origin, destination);

    formatLocations(geocodeTasks)
    .then(function(locations) {

      results.start = {
        address: locations[1],
        coordinates: locations[0]
      }
      results.finish = {
        address: locations[3],
        coordinates: locations[2]
      }

      return getEstimates(results.start.coordinates, results.finish.coordinates)
    })
    .then(function(estimates) {
      results.estimates = estimates;
      resolve(results);
    })
    .catch(function(err) {
      reject(err);
    });
  });
}

module.exports = getUberOptions;
