require("@babel/register");

module.exports = function (api) {
    api.cache(true);

    const presets = [
        "module:metro-react-native-babel-preset"
    ];
    const plugins = [
            ["@babel/plugin-proposal-decorators", {"legacy": true}],
            "@babel/plugin-proposal-object-rest-spread"
        ]
    ;

    return {
        presets,
        plugins
    };
};
