require("@babel/register");

module.exports = function (api) {
    api.cache(true);

    const presets = [
        "@babel/preset-env",
        "@babel/preset-flow"
    ];
    const plugins = [
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