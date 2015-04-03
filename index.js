var loaderUtils = require('loader-utils'),
    babel = require('babel-core'),
    crypto = require('crypto'),
    fs = require('fs'),
    path = require('path'),
    os = require('os'),
    zlib = require('zlib'),
    version = require('./package').version,
    toBoolean = function (val) {
        if (val === 'true') { return true; }
        if (val === 'false') { return false; }
        return val;
    };

module.exports = function (source, inputSourceMap) {

    var options = loaderUtils.parseQuery(this.query),
        callback = this.async(),
        result, cacheDirectory;

    if (this.cacheable) {
        this.cacheable();
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
    delete options.cacheDirectory;

    if (cacheDirectory === true) cacheDirectory = os.tmpdir();

    if (cacheDirectory){
        cachedTranspile(cacheDirectory, source, options, onResult);
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
