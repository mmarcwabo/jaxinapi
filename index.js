/**
 * Primary file for the API
 *  
*/

// Dependencies
var http = require('http');
var url = require('url');

// The server should respond to all requests with a string
var server = http.createServer(function(req, res){
    
    // Get the url and parse it
    // true make url object call the query string 
    var parsedUrl = url.parse(req.url, true);

    // Get the path from the url
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g,'')

    // Send the response
    res.end('Welcome to jaxin API\n');

    // Log the request path
    console.log('Request received on path: '+trimmedPath);
    
});

// Start the server, and have it listen on port 3000
server.listen(3000, function(){
    console.log("Jaxin is listening on port 3000 now");
});