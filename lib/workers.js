/**
 * Worker-related tasks
 * 
 */

// Dependencies
var path = require('path');
var fs = require('fs');
var _data = require('./data');
var http = require('http');
var https = require('https');
var url = require('url');
var helpers = require('./helpers');
var _logs = require('./logs');

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
        'error': false,
        'responseCode': false
    };

    // Mark that the outcome has not been sent yet
    var outcomeSent = false;

    // Parsee the hostname and the path out of the original check data
    var parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
    var hostName = parsedUrl.hostname;
    var path = parsedUrl.path; // Using path instead of "pathname" because we want the querystring
    // Construct the request
    var requestDetails = {
        'protocol': originalCheckData.protocol + ':',
        'hostname': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000,
    };
    // Instantiate the request object (using either the http or https module)
    var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    var req = _moduleToUse.request(requestDetails, function (req) {
        // Grab the status of the sent request
        var status = req.statusCode;
        // Update the checkoutcome
        checkOutcome.responseCode = status;
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });
    // Bind to the error event so it doesn't get thrown
    req.on('error', function (e) {
        // Update  the checkoutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': e
        };
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the timeout event
    req.on('timeout', function (e) {
        // Update  the checkoutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': 'timeout'
        };
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });
    // End the request
    req.end();
};

// Process the checkoutcome, and update the check data as needed, trigger an alert
// Special logic for a check that has never been tested before
workers.processCheckOutcome = function (originalCheckData, checkOutcome) {
    // Decide if the check is considered up or down
    var state = !checkOutcome.error
        && checkOutcome.responseCode
        && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1
        ? 'up' : 'down';

    // Decide if the alert is wanted
    var alertWarranted = originalCheckData.lastChecked
        && originalCheckData.state != state
        ? true : false;

    // Log the outcome
    var timeOfCheck = Date.now();
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

    // Update the check data
    var newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;

    // Save the update
    _data.update('checks', newCheckData.id, newCheckData, function (err) {

        if (!err) {
            // Send the new check data to the next phase in the process if needed
            if (alertWarranted) {
                workers.alertUserToStatusChange(newCheckData);
            } else {
                console.log('Check outcome has not changed, no alert needed');
            }
        } else {
            console.log('Error trying to save updates to one of the checks');
        }
    });
};

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = function (newCheckData) {
    var msg = 'Alert: Your check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state;
    helpers.sendSMSNotification(newCheckData.userPhone, msg, function (err) {
        if (!err) {
            console.log('Success: User was alerted to a status change via SMS');
        } else {
            console.log('Error: User has not been alerted on a state change of the checks');
        }
    })
};

workers.log = function (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) {
    // Form the log data
    var logData = {
        'check': originalCheckData,
        'outcome': checkOutcome,
        'state': state,
        'alert': alertWarranted,
        'time': timeOfCheck
    };

    // Convert data to a string
    var logString = JSON.stringify(logData);

    // Determine the name of the log file
    var logFileName = originalCheckData.id;

    // Append the log string to the file
    _logs.append(logFileName, logString, function (err) {
        if (!err) {
            console.log('Logging to file succeded');
        } else {
            console.log('Logging to file failed');

        }
    });
};


// Timer to execute the worker-process once per minute
workers.loop = function () {
    setInterval(function () {
        workers.gatherAllChecks();
    }, 1000 * 60);
}

// Rotate (compress) the worker-process once per minute
workers.rotateLogs = function () {
    _logs.list(false, function (err, logs) {
        if (!err && logs && logs.length > 0) {
            logs.forEach(function (logName) {
                // Compress the data to a different file
                var logId = logName.replace('.log', '');
                var newFileId = logId + '-' + Date.now();
                _logs.compress(logId, newFileId, function (err) {
                    if (!err) {
                        // Truncate the logs
                        _logs.truncate(logId, function (err) {
                            if (!err) {
                                console.log('Success truncating logFile');
                            } else {
                                console.log('Error truncating logFile');
                            }
                        });

                    } else {
                        console.log('Error compressing one of the log files', err);
                    }
                });
            });

        } else {
            console.log('Error : could not find any logs to rotate');
        }
    })
};

// Timer to execite the log rotation process once per day
workers.logRotationLoop = function () {
    setInterval(function () {
        workers.rotateLogs();
    }, 1000 * 60 * 60 * 24);
}


// Init script
workers.init = function () {
    // Execute all the checks immediately
    workers.gatherAllChecks();

    // Call the loop so the checks will execute later on
    workers.loop();

    // Compress all the logs immediately
    workers.rotateLogs();

    // Call the compression loop
    workers.logRotationLoop();
};

// Export the module
module.exports = workers;