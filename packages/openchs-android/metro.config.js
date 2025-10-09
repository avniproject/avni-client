const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
    transformer: {
        // CRITICAL: Disable Hermes parser to allow Babel to handle decorators
        hermesParser: false,
        
        babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
        
        getTransformOptions: async () => ({
            transform: {
                experimentalImportSupport: false,
                inlineRequires: true,
            },
        }),
    },
    
    resolver: {
        // CRITICAL: Include TypeScript extensions for proper transpilation
        sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json'],
        
        extraNodeModules: {
            "avni-models": path.resolve(__dirname, "node_modules/openchs-models"),
            // Polyfill Node.js modules that don't exist in React Native
            'bindings': path.resolve(__dirname, 'polyfills/bindings.js'),
            'crypto': path.resolve(__dirname, 'polyfills/crypto.js'),
            'fs': path.resolve(__dirname, 'polyfills/bindings.js'),
            'path': require.resolve('path-browserify'),
        },
        
        // Ensure @babel/runtime helpers resolve properly
        resolveRequest: (context, moduleName, platform) => {
            if (moduleName.startsWith('@babel/runtime/helpers/')) {
                try {
                    return {
                        filePath: require.resolve(moduleName, {paths: [context.originModulePath]}),
                        type: 'sourceFile',
                    };
                } catch (e) {
                    // Fallback to default resolution
                }
            }
            return context.resolveRequest(context, moduleName, platform);
        },
    },
    
    // Add require polyfill to Metro's default polyfills
    serializer: {
        getPolyfills: () => {
            // Return Metro's default polyfills + custom require polyfill
            return [
                require.resolve('./metro-polyfill-require.js'),
            ];
        },
    },
    projectRoot: path.resolve(__dirname),
    watchFolders: [],
    resetCache: true
};

module.exports = mergeConfig(defaultConfig, config);
