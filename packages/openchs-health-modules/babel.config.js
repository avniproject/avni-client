require("@babel/register");

module.exports = function (api) {
    api.cache(true);

    const presets = [
        "@babel/preset-env",
        "@babel/preset-flow"
    ];
    const plugins = [
        [
            require.resolve('babel-plugin-module-resolver'),
            {
                root: ["./"],
                alias: {
                    "avni-models": "./node_modules/openchs-models"
                }
            }
        ],
        "transform-class-properties",
        "@babel/plugin-proposal-object-rest-spread",
        "transform-export-extensions",
        [
            "@babel/plugin-proposal-decorators",
            {
                "legacy": true
            }
        ],
        "@babel/plugin-proposal-class-properties",
        "transform-es2015-destructuring",
    ];

    return {
        presets,
        plugins
    };
};