var path = require("path");

const jsoMetroPlugin = require("obfuscator-io-metro-plugin")(
    {
        // for these option look javascript-obfuscator library options from  above url
        compact: false,
        sourceMap: true, // source Map generated after obfuscation is not useful right now so use default value i.e. false
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,
        numbersToExpressions: true,
        simplify: true,
        stringArrayShuffle: true,
        splitStrings: true,
        stringArrayThreshold: 1,
    },
    {
        runInDev: false /* optional */,
        logObfuscatedFiles: true /* optional generated files will be located at ./.jso */,
    }
);

module.exports = {
    transformer: {
        getTransformOptions: async () => ({
            transform: {
                experimentalImportSupport: false,
                inlineRequires: false,
            },
        }),
    },
    ...jsoMetroPlugin,
    resolver: {
        extraNodeModules: {
            "avni-models": path.resolve(__dirname, "node_modules/openchs-models"),
        }
    },

    projectRoot: path.resolve(__dirname),
    watchFolders: [],

    resetCache: true
};
