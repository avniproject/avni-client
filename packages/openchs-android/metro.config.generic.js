const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const config = {
    projectRoot: path.resolve(__dirname),
    watchFolders: [],
    transformer: {
        hermesParser: false,
        getTransformOptions: async () => ({
            transform: {
                experimentalImportSupport: false,
                inlineRequires: false,
            },
        }),
    },
    resolver: {
        extraNodeModules: {
            "avni-models": path.resolve(__dirname, "node_modules/openchs-models"),
        }
    },
    resetCache: true
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);