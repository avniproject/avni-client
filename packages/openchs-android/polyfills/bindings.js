// Polyfill for bindings module in React Native
// Realm and other native modules expect this to exist, but we don't need it in React Native
module.exports = function(name) {
  // For React Native, native modules are handled by autolinking
  // Return empty object or throw helpful error
  return {};
};
