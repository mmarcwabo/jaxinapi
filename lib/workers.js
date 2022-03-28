/**
 * Worker-related tasks
 * 
 */

// Dependencies
var path = require('path');
var fs = required('fs');
var _data = require('./data');
var http = require('http');
var https = require('https');
var url = require('url');
var helpers = require('./helpers');

// Instanciate the worker object
var workers = {};

// Look up all the checks, get their data, send to a validator
workers.gatherAllChecks = function () {
    // Get all the checks
    _data.list('checks', function (err, checks) {
        if (!err && checks && checks.length > 0) {
            checks.forEach(function (check) {
                // Read in the check data
                _data.read('checks', check, function (err, originalCheckData) {
                    if (!err && originalCheckData) {
                        // Pass the chec to validator, and let that function continuer
                        workers.validateCheckData(originalCheckData);
                    } else {
                        console.log("Error reading one of the check's data");
                    }
                });
            });
        } else {
            console.log('Error: Could not find any checks to process');
        }
    });
};

// Sanity-check the check-data
workers.validateCheckData = function (originalCheckData) {
    originalCheckData = typeof (originalCheckData) == 'object'
        && originalCheckData !== null
        ? originalCheckData : {};
    originalCheckData.id = typeof (originalCheckData.id) == 'string'
        && originalCheckData.id.trim().length == 20
        ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof (originalCheckData.userPhone) == 'string'
        && originalCheckData.userPhone.trim().length == 10
        ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof (originalCheckData.protocol) == 'string'
        && ['http', 'https'].indexOf(originalCheckData.protocol.trim()) > -1
        ? originalCheckData.protocol.trim() : false;
    originalCheckData.method = typeof (originalCheckData.method) == 'string'
        && ['get', 'put', 'post', 'delete'].indexOf(originalCheckData.method.trim()) > -1
        ? originalCheckData.method.trim() : false;
    originalCheckData.url = typeof (originalCheckData.url) == 'string'
        && originalCheckData.url.trim().length > 0
        ? originalCheckData.url.trim() : false;
    originalCheckData.successCodes = typeof (originalCheckData.successCodes) == 'object'
        && originalCheckData.successCodes instanceof Array
        && originalCheckData.successCodes.length > 0
        ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof (originalCheckData.timeoutSeconds) == 'number'
        && originalCheckData.timeoutSeconds >= 1
        && originalCheckData.timeoutSeconds <= 5
        ? originalCheckData.timeoutSeconds : false;

    // Set the keys that maynot be saved if the worker have never seen before
    originalCheckData.state = typeof (originalCheckData.state) == 'string'
        && ['up', 'down'].indexOf(originalCheckData.state.trim()) > -1
        ? originalCheckData.state.trim() : 'down';
    originalCheckData.lastChecked = typeof (originalCheckData.lastChecked) == 'number'
        && originalCheckData.lastChecked > 0
        ? originalCheckData.lastChecked : false;

    // If all the checks pass, pass the data along the next step in the process
    if (originalCheckData.id
        && originalCheckData.userPhone
        && originalCheckData.protocol
        && originalCheckData.url
        && originalCheckData.method
        && originalCheckData.successCodes
        && originalCheckData.timeoutSeconds
    ) {
        workers.performCheck(originalCheckData);
    } else {
        console.log('Error: One of the checks is not formated properly');
    }
};

// Perform the check, send the original checkData and the outcome of the check progress
workers.performCheck = function (originalCheckData) {
    var checkOutcome = {
        'error' : false,
        'responseCode' : false
    };

    // Mark that the outcome has not been sent yet
    var outcomeSent = false;

    // Parsee the hostname and the path out of the original check data
    var parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url, true);
    var hostName = parsedUrl.hostname;
    var path = parsedUrl.path; // Using path instead of "pathname" because we want the querystring
}

// Timer to execute the worker-process once per minute
workers.loop = function () {
    setInterval(function () {
        workers.gatherAllChecks();
    }, 1000 * 60);
}


// Init script
workers.init = function () {
    // Execute all the checks immediately
    workers.gatherAllChecks();

    // Call the loop so the checks will execute later on
    workers.loop();
};

// Export the module
module.exports = workers;