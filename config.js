/**
 * Create and export configuration variables
 */

// Container for all the environments
var environments = {};

// Create a staging (default) environnement
environments.staging = {
    'httpPort' : 3000,
    'httpsPort' : 3001,
    'envName' : 'staging'
}

// Create a production environnement
environments.production = {
    'httpPort' : 5000,
    'httpsPort' : 5001,
    'envName' : 'production'
}

// Determine which environment was passed as a command-line argument
var currentEnv = typeof(process.env.NODE_ENV) == 'string' ?
 process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the env above, if not, default is staging

var envToExport = typeof(environments[currentEnv]) == 'object' ?
environments[currentEnv] : environments.staging;

// Export the modules
module.exports = envToExport;