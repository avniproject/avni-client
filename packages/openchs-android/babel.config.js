// React Native 0.76.5 Babel configuration
// Uses hermes-parser (via preset) which handles Flow + decorators correctly
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['@babel/plugin-proposal-decorators', {legacy: true}],
  ],
};
