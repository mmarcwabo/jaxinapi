/**
 * Server related tasks
 * 
 */

// Dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var fs = require('fs');
var stringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var handlers = require('./handlers');
var helpers = require('./helpers');
var path = require('path');
var util = require('util');
var debug = util.debuglog('server');

// Instantiate a server module object
var server = {};

// Send a Twilio SMS To Juilson
// Drc phone number withoud the first 0
var toNum = "993803355";
var msg = "Test";
helpers.sendSMSNotification(toNum, msg, function(err){
    if (!err) {
        console.log('Message sent');
    } else {
        console.log('Message not sent to', '+243'+toNum, '.Error: ', err);
    }
});

// Instantiate the http server 
server.httpServer = http.createServer(function (req, res) {
    server.unifiedServer(req, res);
});

server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
}

// Instantiate the http server
server.httpsServer = https.createServer(server.httpsServerOptions, function (req, res) {
    server.unifiedServer(req, res);
});



// Unified server
server.unifiedServer = function (req, res) {
    // Get the url and parse it
    // true make url object call the query string The server should respond to all requests with a string
    var parsedUrl = url.parse(req.url, true);

    // Get the path from the url
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g, '')

    // Get the query string as an object
    var queryStringObject = parsedUrl.query;

    // Get the HTTP method
    var method = req.method.toLowerCase();

    // Get the headers as an onject
    var headers = req.headers;

    // Get the payload, if any
    var decoder = new stringDecoder('utf-8');
    var buffer = '';
    req.on('data', function (data) {
        buffer += decoder.write(data);
    });
    req.on('end', function () {
        buffer += decoder.end();

        // Choose the handler request should go to. If
        var chosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

        //If the request is within the public directory
        chosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;

        // Construct the data object to send to the handler
        var data = {
            'trimmedPath': trimmedPath,
            'queryString': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        };

        // Route the request to the handler specified is the router
        chosenHandler(data, function (statusCode, payload, contentType) {
            // Determine the type of response (fallback to JSON)
            contentType = typeof (contentType) == 'string' ? contentType : 'json';

            // Use the status code called back by the handler
            statusCode = typeof (statusCode) == 'number' ? statusCode : 200;

            // Return the response-parts that are content-specific
            var payloadString = '';
           if (contentType == 'json') {
                res.setHeader('Content-Type', 'application/json');
                payload = typeof (payload) == 'object' ? payload : {};
                payloadString = JSON.stringify(payload);
            }
            if (contentType == 'html') {
                res.setHeader('Content-Type', 'text/html');
                payloadString = typeof (payload) == 'string' ? payload : '';
            }
            if (contentType == 'favicon') {
                res.setHeader('Content-Type', 'image/x-icon');
                payloadString = typeof (payload) !== 'undefined' ? payload : '';
            }
            if (contentType == 'css') {
                res.setHeader('Content-Type', 'text/css');
                payloadString = typeof (payload) != 'undefine' ? payload : '';
            }
            if (contentType == 'png') {
                res.setHeader('Content-Type', 'image/png');
                payloadString = typeof (payload) !== 'undefined' ? payload : '';
            }
            if (contentType == 'jpg') {
                res.setHeader('Content-Type', 'text/jpeg');
                payloadString = typeof (payload) !== 'undefined' ? payload : '';
            }
            if (contentType == 'plain') {
                res.setHeader('Content-Type', 'text/plain');
                payloadString = typeof (payload) !== 'undefined' ? payload : '';
            }

            // Return the response-parts that are commons to all content-types
            res.writeHead(statusCode);
            res.end(payloadString);

            // Log the request path
            // If the response is 200,print green otherwise print red
            if (statusCode == 200) {
                debug('\x1b[32m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);

            } else {
                debug('\x1b[31m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
            }
        });

    });
};

//Define request router
server.router = {
    '': handlers.index,
    'account/create': handlers.accountCreate,
    'account/edit': handlers.accountEdit,
    'account/deleted': handlers.accountDeleted,
    'session/create': handlers.sessionCreate,
    'session/deleted': handlers.sessionDeleted,
    'checks/all': handlers.checkList,
    'checks/create': handlers.checksCreate,
    'checks/edit': handlers.checksEdit,
    'ping': handlers.ping,
    'api/users': handlers.users,
    'api/tokens': handlers.tokens,
    'api/checks': handlers.checks,
    'favicon.ico': handlers.favicon,
    'public': handlers.public
};

// Init script
server.init = function () {
    // Start the http server
    server.httpServer.listen(config.httpPort, function () {
        console.log("\x1b[36m%s\x1b[0m", "Jaxin is listening on port " + config.httpPort);
    });

    // Start the https server
    server.httpsServer.listen(config.httpsPort, function () {
        console.log("\x1b[35m%s\x1b[0m", "Jaxin is listening on port " + config.httpsPort);
    });


};

// Module exports
module.exports = server;