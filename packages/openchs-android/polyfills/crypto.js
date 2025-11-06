/**
 * Polyfill for Node.js 'crypto' module in React Native
 * Uses react-native-get-random-values for random number generation
 */

import 'react-native-get-random-values';

// Polyfill for crypto.randomBytes using react-native-get-random-values
export function randomBytes(size) {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return Buffer.from(bytes);
}

// Export a minimal crypto object
export default {
    randomBytes,
    getRandomValues: (arr) => crypto.getRandomValues(arr)
};
