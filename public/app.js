/**
 * Frontend logic for the App
 * 
 */

// Container for the frontend application
var app = {};

// Config
app.config = {
    'sessionToken': false
};

// AJAX Client (for the Restful API)
app.client = {};

// Interface for making API calls
app.client.request = function (headers, path, method, queryStringObject, payload, callback) {
    // Set defaults
    headers = typeof(headers) == 'object' && headers !== null ? headers : {};
    path = typeof(path) == 'string'  ? path : '/';
    method = typeof(method) == 'string' 
    && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(method) > -1
    ? method.toUpperCase() : 'GET';
    queryStringObject = typeof(queryStringObject) == 'object' 
    && queryStringObject !== null 
    ? queryStringObject : {};
    payload = typeof(payload) == 'object' && payload !== null ? payload : {};
    callback = typeof(callback) == 'function' ? callback : false;

    // For each querystr param sent, add it to the path
    var requestUrl = path + '?';
    var counter = 0;
    for(var queryKey in queryStringObject){
        if(queryStringObject.hasOwnProperty(queryKey)){
            counter++;
            // If at least one query string param has already been added, prepent new...
            if (counter > 1) {
                requestUrl+='&';
            }
            // Add the key and the value
            requestUrl = queryKey + '=' + queryStringObject[queryKey];
        }
    }

    // Form the http request as a JSON type
    var xhr = new XMLHttpRequest();
    xhr.open(method, requestUrl, true);
    xhr.setRequestHeader("Content-Type", "application/json");

    // For each header sent, add it to the request
    for(var headerKey in headers){
        if(headers.hasOwnProperty(headerKey)){
            xhr.setRequestHeader(headerKey, headers[headerKey]);
        }
    }

    // If there is a current session token set, and that has a header
    
    

};
