const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const config = {
    transformer: {
        // CRITICAL: Disable hermesParser to ensure Babel processes decorators
        hermesParser: false,
        babelTransformerPath: require.resolve('@react-native/metro-babel-transformer'),
        getTransformOptions: async () => ({
            transform: {
                experimentalImportSupport: false,
                inlineRequires: true,
            },
        }),
    },
    resolver: {
        extraNodeModules: {
            "avni-models": path.resolve(__dirname, "node_modules/openchs-models"),
            // Polyfills for Node.js modules
            'bindings': path.resolve(__dirname, 'polyfills/bindings.js'),
            'crypto': path.resolve(__dirname, 'polyfills/crypto.js'),
            'fs': path.resolve(__dirname, 'polyfills/bindings.js'),
        },
    },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
