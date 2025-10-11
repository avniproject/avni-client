var path = require("path");

const jsoMetroPlugin = require("obfuscator-io-metro-plugin")(
    { // this is the config that will least impact the performance according to this doc: https://www.npmjs.com/package/javascript-obfuscator#javascript-obfuscator-options
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        debugProtectionInterval: 0,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: false,
        renameGlobals: false,
        selfDefending: false,
        simplify: true,
        splitStrings: false,
        stringArray: true,
        stringArrayCallsTransform: false,
        stringArrayCallsTransformThreshold: 0.5,
        stringArrayEncoding: [],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 1,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 2,
        stringArrayWrappersType: 'variable',
        stringArrayThreshold: 0.75,
        unicodeEscapeSequence: false,
        sourceMap: true
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
