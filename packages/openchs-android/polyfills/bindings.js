/**
 * Polyfill for the 'bindings' and 'fs' Node.js modules
 * These are not needed in React Native as native modules are linked differently
 */

module.exports = function bindings(name) {
    throw new Error(
        'Node.js "bindings" module is not supported in React Native. ' +
        'Native modules should be linked using autolinking or manual linking.'
    );
};

// Also export empty objects for fs module
module.exports.readFileSync = function() {
    throw new Error('fs.readFileSync is not available in React Native');
};

module.exports.existsSync = function() {
    return false;
};

module.exports.readdirSync = function() {
    return [];
};
