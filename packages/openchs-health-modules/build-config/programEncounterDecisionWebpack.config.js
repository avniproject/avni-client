var path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: ['babel-polyfill', './health_modules/programEncounterDecision.js'],
    output: {
        path: path.resolve(__dirname, '../output'),
        filename: 'programEncounterDecision.js'
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