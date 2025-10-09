// Polyfill for crypto module in React Native
// Use react-native-get-random-values for crypto functionality
import 'react-native-get-random-values';

module.exports = {
  randomBytes: function(size) {
    const array = new Uint8Array(size);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    }
    return Buffer.from(array);
  }
};
