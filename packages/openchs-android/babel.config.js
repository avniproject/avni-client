module.exports = {
    presets: [
        "@react-native/babel-preset"
    ],
    plugins: [
        ["@babel/plugin-proposal-decorators", {"legacy": true}],
        "@babel/plugin-proposal-object-rest-spread"
    ]
};
