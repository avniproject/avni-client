// React Native 0.76.5 Babel configuration
// Preset auto-configures parseLangTypes: 'flow' to skip decorator files
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['@babel/plugin-proposal-decorators', {legacy: true}],
  ],
};
