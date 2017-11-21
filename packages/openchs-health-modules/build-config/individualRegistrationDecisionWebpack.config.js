var path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: './health_modules/individualRegistrationDecision.js',
    output: {
        path: path.resolve(__dirname, '../output'),
        filename: 'individualRegistrationDecision.js'
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                query: {
                    presets: ['env'],
                    plugins: [
                        "transform-class-properties"
                    ]
                }
            }
        ]
    },
    stats: {
        colors: true
    },
};