var loaderUtils = require('loader-utils'),
    pkg = require('./package.json'),
    babel = require('babel-core'),
    cache = require('./lib/fs-cache.js'),
    toBoolean = function (val) {
        if (val === 'true') { return true; }
        if (val === 'false') { return false; }
        return val;
    };

module.exports = function (source, inputSourceMap) {
    var options = loaderUtils.parseQuery(this.query),
        callback = this.async(),
        options = assign({}, this.options.babel, queryOptions, {
            inputSourceMap: inputSourceMap,
            filename: loaderUtils.getRemainingRequest(this),
        }),
        result;


    this.cacheable();


    if (!options.sourceMap) {
        options.sourceMap = this.sourceMap;
    }

    // Convert 'true'/'false' to true/false
    options = Object.keys(options).reduce(function (accumulator, key) {
        accumulator[key] = toBoolean(options[key]);
        return accumulator;
    }, {});

    options.sourceMap = this.sourceMap;
    options.inputSourceMap = inputSourceMap;
    options.filename = loaderUtils.getRemainingRequest(this);

    cacheDirectory = options.cacheDirectory;
    cacheIdentifier = options.cacheIdentifier || JSON.stringify({
        'babel-loader': pkg.version,
        'babel-core': babel.version
    });

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
