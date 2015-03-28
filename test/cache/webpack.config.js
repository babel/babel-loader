var path = require('path');

// Just run "webpack-dev-server"
module.exports = {
    context: __dirname,
    entry: '../fixtures/basic.js',
    output: {
        path: path.resolve(__dirname, '../output'),
        filename: 'bundle.cache.js'
    },
    module: {
        loaders: [
            {
                test: '\.js',
                loader: 'babel?cacheDirectory=' + path.resolve(__dirname, '../output/cache')
            }
        ]
    }
};
