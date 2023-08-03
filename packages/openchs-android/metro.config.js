/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
var path = require("path");
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const config = {
  resolver: {
    extraNodeModules: {
      "avni-models": path.resolve(__dirname, "node_modules/openchs-models"),
    }
  },

  projectRoot: path.resolve(__dirname),
  watchFolders: [],

  resetCache: true
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

