var crypto = require('crypto'),
    fs = require('fs'),
    os = require('os'),
    path = require('path'),
    zlib = require('zlib'),
    assign = require('object-assign'),
    babel = require('babel-core'),
    loaderUtils = require('loader-utils'),
    version = require('./package').version;

module.exports = function (source, inputSourceMap) {

    var queryOptions = loaderUtils.parseQuery(this.query),
        callback = this.async(),
        options = assign({}, this.options.babel, queryOptions, {
            sourceMap: this.sourceMap,
            inputSourceMap: inputSourceMap,
            filename: loaderUtils.getRemainingRequest(this),
        }),
        result;

    if (this.cacheable) {
        this.cacheable();
    }

    if (options.cacheDirectory === true) options.cacheDirectory = os.tmpdir();

    if (options.cacheDirectory){
        cachedTranspile(options.cacheDirectory, source, options, onResult);
    } else {
        onResult(null, transpile(source, options));
    }

    function onResult(err, result){
        if (err) return callback(err);

        callback(err, err ? null : result.code, err ? null : result.map);
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

function cachedTranspile(cacheDirectory, source, options, callback){
    var cacheFile = path.join(cacheDirectory, buildCachePath(cacheDirectory, source, options));

    readCache(cacheFile, function(err, result){
        if (err){
            try {
                result = transpile(source, options);
            } catch (e){
                return callback(e);
            }

            writeCache(cacheFile, result, function(err){
                callback(err, result);
            });
        } else {
            callback(null, result);
        }
    });
}

function readCache(cacheFile, callback){
    fs.readFile(cacheFile, function(err, data){
        if (err) return callback(err);

        zlib.gunzip(data, function(err, content){
            if (err) return callback(err);

            try {
                content = JSON.parse(content);
            } catch (e){
                return callback(e);
            }

            callback(null, content);
        });
    });
}

function writeCache(cacheFile, result, callback){
    var content = JSON.stringify(result);

    zlib.gzip(content, function(err, data){
        if (err) return callback(err);

        fs.writeFile(cacheFile, data, callback);
    });
}

function buildCachePath(dir, source, options){
    var hash = crypto.createHash('SHA1');
    hash.end(JSON.stringify({
        loaderVersion: version,
        babelVersion: babel.version,
        source: source,
        options: options
    }));
    return 'babel-loader-cache-' + hash.read().toString('hex') + '.json.gzip';
}
