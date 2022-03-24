/**
 * Request handlers
 * 
 */

// Dependencies
var _data = require('./data');
var helpers = require('./helpers');

// Define the handlers
var handlers = {};

// Users
handlers.users = function(data, callback){
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1){
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
}

// Container for the users submethods
handlers._users = {};

// Users - post
// Required data: fn, ln, phone, password; tosAgreement
// Optional data: none
handlers._users.post = function(data, callback){
    // Check that all required fields are filled out
    var firstName = typeof(data.payload.firstName) == 'string' 
    && data.payload.firstName.trim().length > 0 
    ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' 
    && data.payload.lastName.trim().length > 0 
    ? data.payload.lastName.trim() : false;
    var phone = typeof(data.payload.phone) == 'string'
    && data.payload.phone.trim().length == 10 
    ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string'
    && data.payload.password.trim().length  > 0  
    ? data.payload.password.trim() : false;
    var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean'
    && data.payload.tosAgreement == true  
    ? true : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        // Make sure that the user does not already exist
        _data.read('users', phone, function(err,data){
            if (err) {
                // Hash the password
                var hashedPassword = helpers.hash(password);

                // Create the user object
                if (hashedPassword) {
                var userObjet = {
                    'firstName' : firstName,
                    'lastName' : lastName,
                    'phone' : phone,
                    'hashedPassword' : hashedPassword,
                    'tosAgreement' : true
                };

                // Persist the user
                _data.create('users', phone, userObjet, function(err){
                    if (!err){
                        callback(200);
                    } else {
                        console.log(err);
                        callback(500, {'Error' : 'Could not create the new user'});
                    }
                });
                } else {
                    callback(500, {'Error' : 'Could not hash the user\'s passowrd'})
                }                

            } else {
                callback(400, {'Error' : 'The user whith that phone number already exists'});
            }

        });

    } else {
        callback(400, {'Error' : 'Missing required fields'});
    }
    
};

// Users - get
// Required data: phone
// Optional data: none
// @TODO Only authenticated users should access their objects (own objects)
handlers._users.get = function(data, callback){
    // Check that the phone is valid
    var phone =  typeof(data.queryString.phone) == 'string' 
    && data.queryString.phone.trim().length == 10 
    ? data.queryString.phone : false;

    if (phone) {
        // Lookup the user
        _data.read('users', phone, function(err, data){
            if (!err && data) {
                // Remove the hashed password from the user object
                delete data.hashedPassword;
                callback(200, data);

            } else {
                callback(404);
            }
        });

    } else {
        callback(400, {'Error' : 'Missing required field'});
    }

};

// Users - put
// Required data: phone
// Optional data: fn, ln, password (at least one must be specified)
// @TODO Authentication 
handlers._users.put = function(data, callback){
    // Check for the required field
    var phone =  typeof(data.payload.phone) == 'string' 
    && data.payload.phone.trim().length == 10 
    ? data.payload.phone : false;

    // Check for the optional fields
    var firstName = typeof(data.payload.firstName) == 'string' 
    && data.payload.firstName.trim().length > 0 
    ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' 
    && data.payload.lastName.trim().length > 0 
    ? data.payload.lastName.trim() : false;
    var phone = typeof(data.payload.phone) == 'string'
    && data.payload.phone.trim().length == 10 
    ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string'
    && data.payload.password.trim().length  > 0  
    ? data.payload.password.trim() : false;
    
    // Error if the phone number is missing
    if (phone) {
        // Error if nothing is sent for the update
        if (firstName || lastName || password) {
            // Look up the user
            _data.read('users', phone, function(err, userData){
                if (!err && userData) {
                    // Update the user
                    if (firstName) {
                        userData.firstName = firstName;
                    }
                    if (lastName) {
                        userData.lastName = lastName;
                    }
                    if (password) {
                        userData.hashedPassword = helpers.hash(password);
                    }
                    // Persist the new updates
                    _data.update('users', phone, userData, function(err){
                        if (!err) {
                            callback(200);

                        } else {
                            console.log(err);
                            callback(500, {'Error' : 'Not able to update the user'});
                        }

                    });
                } else {
                    callback(400, {'Error' : 'The specified user doesnot exists'});
                }

            });

        } else {
            callback(400, {'Error' : 'Missing data to update'})
        }

    } else {
        callback(400, {'Error' : 'Missing required fields'});
    }

};

// Users - delete
// Required data: phone
// @TODO Only let an authenticated user delete their object
// @TODO Clean up any other data files associated with this user 
handlers._users.delete = function(data, callback){
       // Check that the phone is valid
       var phone =  typeof(data.queryString.phone) == 'string' 
       && data.queryString.phone.trim().length == 10 
       ? data.queryString.phone : false;
   
       if (phone) {
           // Lookup the user
           _data.read('users', phone, function(err, data){
               if (!err && data) {
                   _data.delete('users', phone, function(err) {
                      if (!err) {
                          callback(200);

                      } else {
                          callback(500, {'Error' : 'Could not delete the specified user'});
                      }
                   });
   
               } else {
                   callback(400, {'Error' : 'Could not find the specified user'});
               }
           });
   
       } else {
           callback(400, {'Error' : 'Missing required field'});
       }
};
// Ping handler
handlers.ping = function(data, callback){
    callback(200);
};

// Not found handler
handlers.notFound = function(data, callback){
    callback(404);
};

// Export the handler
module.exports = handlers;
