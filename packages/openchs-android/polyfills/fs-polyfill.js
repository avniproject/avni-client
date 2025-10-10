// Polyfill for bindings module in React Native
// Used by modules like SJCL that expect Node.js bindings
// NOTE: Realm is excluded from this polyfill via Metro config's resolveRequest
module.exports = function(name) {
  // For React Native, native modules are handled by autolinking
  // Return empty object for modules that don't need native bindings
  return {};
};
