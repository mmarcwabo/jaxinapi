/**
 * Helpers for various tasks
 * 
 */

// Dependencies
var crypto = require('crypto');
var config = require('./config');


// Container for helpers
var helpers = {};

// Create a sha256 hash
helpers.hash = function (string) {
    if (typeof (string) == 'string' && string.length > 0) {
        var hash = crypto.createHmac('sha256', config.hashingSecret).update(string).digest('hex');
        return hash;
    } else {
        return false;
    }
}

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = function (str) {
    try {
        var obj = JSON.parse(str);
        return obj;
    } catch (error) {
        return {};
    }
}

// Create a string of alphanumeric characters of a given length
helpers.createRandomString = function (strLen) {
    strLen = typeof (strLen) == 'number' && strLen > 0 ? strLen : false;

    if (strLen) {
        // Define the possible chars that could go into a string
        var possibleChars = 'abcdefghijklmnopqrstuvwxyz0312456789';

        // Start the final string
        var str = '';
        for (var i = 1; i <= strLen; i++) {
            // Get a random char from the possible chars string
            var randomChar = possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
            // Append character to the final string
            str += randomChar;
        }
        // Return the final string
        return str;
    } else {
        return false;
    }
}


// Export the container
module.exports = helpers;