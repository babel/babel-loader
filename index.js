var assign = require('object-assign'),
    babel = require('babel-core'),
    cache = require('./lib/fs-cache.js'),
    loaderUtils = require('loader-utils'),
    pkg = require('./package.json');

module.exports = function (source, inputSourceMap) {
    var queryOptions = loaderUtils.parseQuery(this.query),
        callback = this.async(),
        options = assign({
            inputSourceMap: inputSourceMap,
            filename: loaderUtils.getRemainingRequest(this),
            cacheIdentifier: JSON.stringify({
                'babel-loader': pkg.version,
                'babel-core': babel.version
            })
        }, this.options.babel, queryOptions),
        result;


    this.cacheable();

    if (!options.sourceMap) {
        options.sourceMap = this.sourceMap;
    }


    cacheDirectory = options.cacheDirectory;
    cacheIdentifier = options.cacheIdentifier;

    delete options.cacheDirectory;
    delete options.cacheIdentifier;

    if (cacheDirectory){
        cache({
            directory: cacheDirectory,
            identifier: cacheIdentifier,
            source: source,
            options: options,
            transform: transpile,
        }, function (err, result) {
            callback(err, result.code, result.map);
        });
    } else {
        result = transpile(source, options);
        callback(null, result.code, result.map);
    }
};

function transpile(source, options){

    var result = babel.transform(source, options);

    var code = result.code;
    var map = result.map;

    if (map) {
        map.sourcesContent = [source];
    }

    return {
        code: code,
        map: map
    };
}
