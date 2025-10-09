module.exports = {
    presets: [
        'module:@react-native/babel-preset',
    ],
    plugins: [
        // CRITICAL: Decorators MUST come first
        ["@babel/plugin-proposal-decorators", {"legacy": true}],
        
        // CRITICAL: Disable runtime helpers to avoid require() calls
        ["@babel/plugin-transform-runtime", {
            "helpers": false,      // Inline helpers instead of require()
            "regenerator": false   // Inline regenerator
        }],
        
        "@babel/plugin-proposal-object-rest-spread"
    ]
};
