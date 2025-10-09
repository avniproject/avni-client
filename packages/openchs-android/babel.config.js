module.exports = {
    presets: [
        ['module:@react-native/babel-preset', {
            // CRITICAL: Disable runtime helpers to prevent require() calls
            enableBabelRuntime: false,
        }],
    ],
    plugins: [
        // CRITICAL: Decorators MUST come first
        ["@babel/plugin-proposal-decorators", {"legacy": true}],
        
        "@babel/plugin-proposal-object-rest-spread"
    ]
};
