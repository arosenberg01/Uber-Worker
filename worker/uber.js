var qs = require('querystring');
var Promise = require('bluebird');
var rp = require('request-promise');
var async = require('async');
var moment = require('moment');
var parseSeconds = require('./seconds.js');
var uberApiEndpoint = 'https://api.uber.com/v1/estimates/';

// TODO = how to send credentials

var uberToken = process.env.UBER_TOKEN || "BcFMxgIHLmgW-EtL64kD9oK1Ye6so8Iq2ESvBTK2";

/**
 * Build urls to request time and price estimates for route from Uber API
 */

/**
 * Build urls to request time and price estimates for route from Uber API
 * @param {Object} origin - Long and lat coordinates of origin: { longitude: '-122.449571', latitude: '37.7107389' }
 * @param {Object} destination - Long and lat coordinates of destination: { longitude: '-122.449571', latitude: '37.7107389' }
 */
function UberEstimateUrls (origin, destination) {

  var timeEstimateParams = {
    server_token: uberToken,
    start_longitude: origin.longitude,
    start_latitude: origin.latitude
  };

  var priceEstimateParams = {
    server_token: uberToken,
    start_longitude: origin.longitude,
    start_latitude: origin.latitude,
    end_longitude: destination.longitude,
    end_latitude: destination.latitude
  };

  this.urls = {
    timeEstimate: uberApiEndpoint + 'time?' + qs.stringify(timeEstimateParams),
    priceEstimate: uberApiEndpoint + 'price?' + qs.stringify(priceEstimateParams)
  };
};


/**
 * Consolidate distinct price and time estimates into a single unified estimate per Uber product
 * @param  {Object} estimates - Contains results of Uber API price and time estimate requests for a route: {priceEsimte: {...}, timeEstimate: {...}}
 * @return {Array} - Array of available Uber options (UberX, UberXL, etc)
 */
function combineEstimates(estimates) {
  var combinedEstimates = {};

  // TODO
  estimates.priceEstimate.prices.forEach(function(estimate) {
    var uberType = estimate.localized_display_name;
    if (!combinedEstimates[uberType]) {
      combinedEstimates[uberType] = {};
    }
    for (var property in estimate) {
      var newKey = 'price_' + property;
      combinedEstimates[uberType][newKey] = estimate[property];
    }
  });

  // TODO
  estimates.timeEstimate.times.forEach(function(estimate) {
    var uberType = estimate.localized_display_name;
    if (!combinedEstimates[uberType]) {
      combinedEstimates[uberType] = {};
    }
    for (var property in estimate) {
      var newKey = 'time_' + property;
      combinedEstimates[uberType][newKey] = estimate[property];
    }
  });

  var options = [];
  for (var uberCar in combinedEstimates) {
    options.push(combinedEstimates[uberCar])
  }
  return options
}

/**
 * Hit Uber API for price and time estimates from an origin to a destination
 * @param {Object} origin - Long and lat coordinates of origin: { longitude: '-122.449571', latitude: '37.7107389' }
 * @param {Object} destination - Long and lat coordinates of destination: { longitude: '-122.449571', latitude: '37.7107389' }
 * @return {Array} - Array of available Uber options (UberX, UberXL, etc)
 */
function getEstimates(origin, destination) {
  return new Promise(function(resolve, reject) {
    var uberResults = {};
    var requestUrls = new UberEstimateUrls(origin, destination); 
    async.parallel({ 
      // Retrieve price estimates
      priceEstimate: function(cb) {
        rp(requestUrls.urls.priceEstimate)
        .then(function(body) {
          var data = JSON.parse(body);
          data.prices.forEach(function(price) {
            price.parsedArrivalTime = parseSeconds(price.duration);
          })
          cb(null, data);
        })
        .catch(function(err) {
          cb(err, null);
        })
      },
      // Retrive time estimates
      timeEstimate: function(cb) {
        rp(requestUrls.urls.timeEstimate)
        .then(function(body) {
          var data = JSON.parse(body);
          data.times.forEach(function(time) {
            time.parsedDuration = parseSeconds(time.estimate);
          })
          cb(null, data);
        })
        .catch(function(err) {
          cb(err, null);
        });
      }
    },
    // Combine and return price and time estimates for Uber rides
    function(err, estimates) {
      if (err) {
        console.log('error', err)
        reject(err);
      } else {
        var combinedEstimates = combineEstimates(estimates)
        resolve(combinedEstimates);
      }
    }
    );
  });
}

module.exports = getEstimates
