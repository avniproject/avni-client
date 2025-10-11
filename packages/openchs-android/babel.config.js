// CRITICAL: React Native 0.76.5 hardcodes babel-plugin-syntax-hermes-parser
// which doesn't support decorators. Override it with standard Babel parser.

module.exports = function(api) {
    api.cache(true);
    
    return {
        presets: ['module:@react-native/babel-preset'],
        plugins: [
            // Decorators MUST come before other class transforms
            ['@babel/plugin-proposal-decorators', {legacy: true}],
        ],
        // Override the parser to use Babel's default (not hermes-parser)
        overrides: [
            {
                // Apply to all files
                test: /.*/,
                parserOpts: {
                    // Use Babel's own parser with decorator support
                    plugins: ['decorators-legacy', 'flow', 'jsx'],
                },
            },
        ],
    };
};
