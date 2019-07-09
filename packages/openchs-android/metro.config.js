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
            "openchs-health-modules": path.resolve(__dirname, "node_modules/openchs-health-modules"),
        }
    },

    projectRoot: path.resolve(__dirname),
    watchFolders: [
        path.resolve(__dirname, "../openchs-health-modules"),
    ],

    resetCache: true
};
