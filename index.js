/**
 * Primary file for the API
 *  
*/

// Dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var stringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');

// Instantiate the http server
var httpServer = http.createServer(function(req, res){
    unifiedServer(req, res);  
});

var httpsServerOptions = {
    'key' : fs.readFileSync('./https/key.pem'),
    'cert' : fs.readFileSync('./https/cert.pem')
}

// Instantiate the http server
var httpsServer = https.createServer(httpsServerOptions, function(req, res){
    unifiedServer(req, res);  
});

// Start the http server
httpServer.listen(config.httpPort, function(){
    console.log("Jaxin is listening on port "+config.httpPort+" in "+config.envName+" now");
});

// Start the https server
httpsServer.listen(config.httpsPort, function(){
    console.log("Jaxin is listening on port "+config.httpsPort+" in "+config.envName+" now");
});

// Unified server
var unifiedServer = function(req, res){
    // Get the url and parse it
    // true make url object call the query string The server should respond to all requests with a string
    var parsedUrl = url.parse(req.url, true);

    // Get the path from the url
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g,'')

    // Get the query string as an object
    var queryStringObject = parsedUrl.query;
    
    // Get the HTTP method
    var method = req.method.toLowerCase();

    // Get the headers as an onject
    var headers = req.headers;

    // Get the payload, if any
    var decoder = new StringDecoder('utf-8');
    var buffer = '';
    req.on('data', function(data){
        buffer += decoder.write(data);
    });
    req.on('end', function(){
        buffer += decoder.end();

        // Choose the handler request should go to. If
        var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

        // Construct the data object to send to the handler
        var data = {
            'trimmedPath' : trimmedPath,
            'queryString' : queryStringObject,
            'method' : method,
            'headers' : headers,
            'payload' : buffer
        };

        // Route the request to the handler specified is the router
        chosenHandler(data, function(statusCode, payload){
            // Use the status code called back by the handler
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // Use the payload
            payload = typeof(payload) == 'object' ? payload : {}

            // Convert the payload to a string
            var payloadString = JSON.stringify(payload);

            // Return the response (json)
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);
            // Log the request path
            console.log('Returning this response: ', statusCode, payloadString);
        });

    });
};
//Define the handlers
var handlers = {};

// Sample handler
handlers.sample = function(data, callback){
    callback(406, {'name' : 'sample handler'});
};

// Not found handler
handlers.notFound = function(data, callback){
    callback(404);
};


//Define request router
var router = {
    'sample': handlers.sample
};