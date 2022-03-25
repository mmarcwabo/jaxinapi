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
handlers.users = function (data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
}

// Tokens
handlers.tokens = function (data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
}

// Container for the users submethods
handlers._users = {};

// Container for the tokens submethods
handlers._tokens = {};

// Users - post
// Required data: fn, ln, phone, password; tosAgreement
// Optional data: none
handlers._users.post = function (data, callback) {
    // Check that all required fields are filled out
    var firstName = typeof (data.payload.firstName) == 'string'
        && data.payload.firstName.trim().length > 0
        ? data.payload.firstName.trim() : false;
    var lastName = typeof (data.payload.lastName) == 'string'
        && data.payload.lastName.trim().length > 0
        ? data.payload.lastName.trim() : false;
    var phone = typeof (data.payload.phone) == 'string'
        && data.payload.phone.trim().length == 10
        ? data.payload.phone.trim() : false;
    var password = typeof (data.payload.password) == 'string'
        && data.payload.password.trim().length > 0
        ? data.payload.password.trim() : false;
    var tosAgreement = typeof (data.payload.tosAgreement) == 'boolean'
        && data.payload.tosAgreement == true
        ? true : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        // Make sure that the user does not already exist
        _data.read('users', phone, function (err, data) {
            if (err) {
                // Hash the password
                var hashedPassword = helpers.hash(password);

                // Create the user object
                if (hashedPassword) {
                    var userObjet = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phone': phone,
                        'hashedPassword': hashedPassword,
                        'tosAgreement': true
                    };

                    // Persist the user
                    _data.create('users', phone, userObjet, function (err) {
                        if (!err) {
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, { 'Error': 'Could not create the new user' });
                        }
                    });
                } else {
                    callback(500, { 'Error': 'Could not hash the user\'s passowrd' })
                }

            } else {
                callback(400, { 'Error': 'The user whith that phone number already exists' });
            }

        });

    } else {
        callback(400, { 'Error': 'Missing required fields' });
    }

};

// Users - get
// Required data: phone
// Optional data: none
// @TODO Only authenticated users should access their objects (own objects)
handlers._users.get = function (data, callback) {
    // Check that the phone is valid
    var phone = typeof (data.queryString.phone) == 'string'
        && data.queryString.phone.trim().length == 10
        ? data.queryString.phone : false;

    if (phone) {
        // Get the token form the headers
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the give token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
            if (tokenIsValid) {
                // Lookup the user
                _data.read('users', phone, function (err, data) {
                    if (!err && data) {
                        // Remove the hashed password from the user object
                        delete data.hashedPassword;
                        callback(200, data);
                    } else {
                        callback(404, { 'Error': err });
                    }
                });
            } else {
                callback(403, { 'Error': 'Missing required token in headers or token is invalid' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }

};

// Users - put
// Required data: phone
// Optional data: fn, ln, password (at least one must be specified)
// @TODO Authentication 
handlers._users.put = function (data, callback) {
    // Check for the required field
    var phone = typeof (data.payload.phone) == 'string'
        && data.payload.phone.trim().length == 10
        ? data.payload.phone : false;

    // Check for the optional fields
    var firstName = typeof (data.payload.firstName) == 'string'
        && data.payload.firstName.trim().length > 0
        ? data.payload.firstName.trim() : false;
    var lastName = typeof (data.payload.lastName) == 'string'
        && data.payload.lastName.trim().length > 0
        ? data.payload.lastName.trim() : false;
    var phone = typeof (data.payload.phone) == 'string'
        && data.payload.phone.trim().length == 10
        ? data.payload.phone.trim() : false;
    var password = typeof (data.payload.password) == 'string'
        && data.payload.password.trim().length > 0
        ? data.payload.password.trim() : false;

    // Error if the phone number is missing
    if (phone) {
        // Error if nothing is sent for the update
        if (firstName || lastName || password) {

            // Get the token form the headers
            var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
            // Verify that the give token is valid for the phone number
            handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
                if (tokenIsValid) {
                    // Look up the user
                    _data.read('users', phone, function (err, userData) {
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
                            _data.update('users', phone, userData, function (err) {
                                if (!err) {
                                    callback(200);

                                } else {
                                    console.log(err);
                                    callback(500, { 'Error': 'Not able to update the user' });
                                }

                            });
                        } else {
                            callback(400, { 'Error': 'The specified user doesnot exists' });
                        }

                    });

                } else {
                    callback(403, { 'Error': 'Missing required token in headers or token is invalid' });
                }

            });


        } else {
            callback(400, { 'Error': 'Missing data to update' })
        }

    } else {
        callback(400, { 'Error': 'Missing required fields' });
    }

};

// Users - delete
// Required data: phone
// @TODO Only let an authenticated user delete their object
// @TODO Clean up any other data files associated with this user 
handlers._users.delete = function (data, callback) {
    // Check that the phone is valid
    var phone = typeof (data.queryString.phone) == 'string'
        && data.queryString.phone.trim().length == 10
        ? data.queryString.phone : false;

    if (phone) {
        // Lookup the user
        _data.read('users', phone, function (err, data) {
            if (!err && data) {
                _data.delete('users', phone, function (err) {
                    if (!err) {
                        callback(200);

                    } else {
                        callback(500, { 'Error': 'Could not delete the specified user' });
                    }
                });

            } else {
                callback(400, { 'Error': 'Could not find the specified user' });
            }
        });

    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function (data, callback) {
    // Check that all required fields are filled out
    var phone = typeof (data.payload.phone) == 'string'
        && data.payload.phone.trim().length == 10
        ? data.payload.phone.trim() : false;
    var password = typeof (data.payload.password) == 'string'
        && data.payload.password.trim().length > 0
        ? data.payload.password.trim() : false;

    if (phone && password) {
        // Look up the user
        _data.read('users', phone, function (err, userData) {
            if (!err && userData) {
                // Hash the pass, compare it to the pass stored in the user obj
                var hashedPassword = helpers.hash(password);
                if (hashedPassword == userData.hashedPassword) {
                    // If valid, create new token with a random name. Set expiration date 1 hour in the future
                    var tokenId = helpers.createRandomString(20);
                    var expires = Date.now() + 1000 * 60 * 60;

                    var tokenObject = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': expires
                    }

                    // Persist the token
                    _data.create('tokens', tokenId, tokenObject, function (err) {
                        if (!err) {
                            callback(200, tokenObject);
                        } else {
                            callback(500, { 'Error': 'Could not create the token' });
                        }
                    })
                } else {
                    callback(400, { 'Error': 'Password did not match the specified user\'s stored password' });
                }

            } else {
                callback(400, { 'Error': 'Could not find the specified user' });
            }

        });

    } else {
        callback(400, { 'Error': 'Missing required fields' });
    }

};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function (data, callback) {
    var id = typeof (data.queryString.id) == 'string'
        && data.queryString.id.trim().length == 20
        ? data.queryString.id.trim() : false;

    if (id) {
        _data.read('tokens', id, function (err, tokenData) {
            if (!err && tokenData) {
                callback(200, tokenData);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function (data, callback) {
    // Check that all required fields are filled out
    var id = typeof (data.payload.id) == 'string'
        && data.payload.id.trim().length == 20
        ? data.payload.id.trim() : false;
    var extend = typeof (data.payload.extend) == 'boolean'
        && data.payload.extend == true
        ? true : false;

    if (id && extend) {
        // Look up the token
        _data.read('tokens', id, function (err, tokenData) {
            if (!err && tokenData) {
                // Check if token is not expired yet
                if (tokenData.expires > Date.now()) {
                    // Set the expiration hour for now
                    tokenData.expires = Date.now() + 1000 * 60 * 60;

                    // Persist the new updates
                    _data.update('tokens', id, tokenData, function (err) {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(500, { 'Error': 'Could not update the token\'s expiration' });
                        }
                    });
                } else {
                    callback(400, { 'Error': 'The token has already expired, and cannot be extended' });
                }
            } else {
                callback(400, { 'Error': 'Specified token does not exist' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required fields or fields are invalid' });
    }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function (data, callback) {
    id = typeof (data.queryString.id) == 'string'
        && data.queryString.id.trim().length == 20 ?
        data.queryString.id.trim() : false;

    if (id) {
        // Lookup the toke
        _data.read('tokens', id, function (err, data) {
            if (!err && data) {
                // Unlink the token
                _data.delete('tokens', id, function (err) {
                    if (!err) {
                        callback(200, { 'success': 'Token ' + id + ' successfully deleted!' });

                    } else {
                        callback(500, { 'Error': 'Cannot delete the specified token' });
                    }
                });
            } else {
                callback(400, { 'Error': 'Cannot find the specified token' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing of required data' });
    }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, phone, callback) => {
    // Look up the token
    _data.read('tokens', id, function (err, tokenData) {
        if (!err && tokenData) {
            // Check if the token is for the given user and has not expired
            if (tokenData.phone == phone && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
};


// Ping handler
handlers.ping = function (data, callback) {
    callback(200);
};

// Not found handler
handlers.notFound = function (data, callback) {
    callback(404, { 'Error': 'Not found' });
};

// Export the handler
module.exports = handlers;
