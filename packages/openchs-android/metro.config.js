var path = require("path");

module.exports = {
    transformer: {
        getTransformOptions: async () => ({
            transform: {
                experimentalImportSupport: false,
                inlineRequires: false,
            },
        }),
    },

    resolver: {
        extraNodeModules: {
            "openchs-models": path.resolve(__dirname, "../openchs-models"),
            "openchs-health-modules": path.resolve(__dirname, "../openchs-health-modules"),
        }
    },

    projectRoot: path.resolve(__dirname),
    watchFolders: [
        path.resolve(__dirname, "../openchs-models"),
        path.resolve(__dirname, "../openchs-health-modules"),
    ],

    resetCache: true
};
