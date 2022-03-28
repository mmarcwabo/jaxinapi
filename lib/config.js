/**
 * Create and export configuration variables
 */

// Container for all the environments
var environments = {};

// Create a staging (default) environnement
environments.staging = {
    'httpPort' : 3000,
    'httpsPort' : 3001,
    'envName' : 'staging',
    'hashingSecret': 'ThisIsASalt',
    'maxChecks': 5,
    'twilio' : {
        'accountSid' : 'ACd15e127a77b8a01c16a90348c3523b8d',
        'authToken' : '762eafb31809f8f7ba3f199767992446',
        'fromPhone' : '+19169995424'
    }
};

// Create a production environnement
environments.production = {
    'httpPort' : 5000,
    'httpsPort' : 5001,
    'envName' : 'production',
    'hashingSecret': 'ThisIsASpecialSalt',
    'maxChecks': 5,
    'twilio' : {
        'accountSid' : '',
        'authToken' : '',
        'fromPhone' : ''
    }
};

// Determine which environment was passed as a command-line argument
var currentEnv = typeof(process.env.NODE_ENV) == 'string' ?
 process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the env above, if not, default is staging

var envToExport = typeof(environments[currentEnv]) == 'object' ?
environments[currentEnv] : environments.staging;

// Export the modules
module.exports = envToExport;