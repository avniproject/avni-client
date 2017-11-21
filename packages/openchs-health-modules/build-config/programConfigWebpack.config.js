var path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: './health_modules/programConfig.js',
    output: {
        path: path.resolve(__dirname, '../output'),
        filename: 'programConfig.js'
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