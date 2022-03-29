/**
 * Helpers for various tasks
 * 
 */

// Dependencies
var crypto = require('crypto');
var config = require('./config');
var https = require('https');
var querystring = require('querystring');
var path = require('path');
var fs = require('fs');

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
};

// Send an SMS message via Twilio
helpers.sendSMSNotification = function (phone, msg, callback) {
    // Validating params
    phone = typeof (phone) == 'string'
        && phone.trim().length == 9
        ? phone.trim() : false;
    msg = typeof (msg) == 'string'
        && msg.trim().length > 0 && msg.trim().length <= 1600 ?
        msg.trim() : false;

    if (phone && msg) {
        // Configure the request payload
        var payload = {
            'From': config.twilio.fromPhone,
            'To': '+243' + phone,
            'Body': msg
        }
        // Stringify the payload
        var stringPayload = querystring.stringify(payload);

        // Config the request details
        var requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
            'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        };
        // instantiate the request object
        var req = https.request(requestDetails, function (res) {
            // Grab the status of the sent request
            var status = res.statusCode;
            // Callback successfully if the request went though
            if (status == 200 || status == 201) {
                callback(false);
            } else {
                callback('Status code ' + status);
            }
        });
        // Bind to the error event so it does not get thrown
        req.on('error', function (e) {
            callback(e);
        });
        //Add the payload
        req.write(stringPayload);

        // End the request 
        req.end();
    } else {
        callback('Given parameters were missing or invalid');
    }

}

// Get the string content of a template
helpers.getTemplate = function (templateName, data, callback) {
    templateName = typeof (templateName) == 'string'
        && templateName.length > 0
        ? templateName : false;
    data = typeof (data) == 'object' && data !== null ? data : {};

    if (templateName) {
        var templatesDir = path.join(__dirname, '/../templates/');
        fs.readFile(templatesDir + templateName + '.html', 'utf8', function (err, str) {
            if (!err && str && str.length > 0) {
                // Do interpolation on the string
                var finalString = helpers.interpolate(str, data);
                callback(false, finalString);
            } else {
                callback('No template could be found');
            }
        });
    } else {
        callback('A valid template name was not specified');
    }
};

// Add the universal header and footer to a string and pass provided data to 
helpers.addUniversalTemplates = function (str, data, callback) {
    str = typeof (str) == 'string' && str.length > 0 ? str : '';
    data = typeof (data) == 'object' && data !== null ? data : {};
    // Get the header
    helpers.getTemplate('_header', data, function (err, headerString) {
        if (!err && headerString) {
            // Get the footer
            helpers.getTemplate('_footer', data, function (err, footerString) {
                if (!err && footerString) {
                    // Add them all together
                    var fullString = headerString + str + footerString;
                    callback(false, fullString);
                } else {
                    callback('Could not find the footer template');
                }
            });
        } else {
            callback('Could not find the header template');
        }

    });
}

// Take a give string and a data object and find / replace all the keys within it
helpers.interpolate = function (str, data) {
    str = typeof (str) == 'string' && str.length > 0 ? str : '';
    data = typeof (data) == 'object' && data !== null ? data : {};

    // Add the templateGlobals do the data object, prepending their key name  with "global"
    for (var keyName in config.templateGlobals) {
        if (config.templateGlobals.hasOwnProperty(keyName)) {
            data['global.' + keyName] = config.templateGlobals[keyName];
        }
    }

    // For each object, insert its value into the string at the corresponding placeholder
    for (var key in data) {
        if (data.hasOwnProperty(key) && typeof (data[key]) == 'string') {
            var replace = data[key];
            var find = '{'+key+'}';
            str = str.replace(find, replace);
        }
    }
    return str;
};

// Export the container
module.exports = helpers;