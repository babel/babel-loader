/**
 * Module dependencies
 */

var loaderUtils = require('loader-utils'),
    babel = require('babel-core'),
    crypto = require('crypto'),
    fs = require('fs'),
    path = require('path'),
    os = require('os'),
    zlib = require('zlib'),
    version = require('./package').version,
    syncZlib = !!zlib.gzipSync;

module.exports = function (source, inputSourceMap) {
    var options, cb, isAsync, cache;

    this.cacheable && this.cacheable();

    options = loaderUtils.parseQuery(this.query);
    for (var k in options) {
        options[k] = toBoolean(options[k]);
    }

    options.sourceMap = this.sourceMap;
    options.inputSourceMap = inputSourceMap;
    options.filename = loaderUtils.getRemainingRequest(this);

    cb = this.async();
    isAsync = !!cb;
    cb = cb || function (err, res) {
        if (err) throw err;
        return res;
    }

    cache = formatCache(options.cacheDirectory, source, options, isAsync);
    delete options.cacheDirectory;

    return readCache(cache, isAsync, function(err, res) {
        if (res) return cb(null, res.code, res.map);
        return transpile(source, options, function(err, res) {
            if (err) return cb(err);

            return writeCache(cache, res, isAsync, function() {
                return cb(null, res.code, res.map);
            });
        });
    });
};

function transpile(source, options, cb) {
    var result, code, map;
    try {
        result = babel.transform(source, options);
    } catch (err) {
        return cb(err);
    }

    code = result.code;
    map = result.map;
    if (map) map.sourcesContent = [source];

    return cb(null, {
        code: code,
        map: map
    });
}

/**
 * cache interfaces
 */

function readCache(cache, isAsync, cb) {
    if (!cache) return cb();
    return read(cache, isAsync, function(err, buf) {
        if (err) return cb(err);
        return gunzip(buf, isAsync, function(err, json) {
            if (err) return cb(err);
            try {
                return cb(null, JSON.parse(json.toString()));
             } catch (err) {
                return cb(err);
            }
        });
    });
}

function writeCache(cache, res, isAsync, cb) {
    if (!cache) return cb();
    return gzip(JSON.stringify(res), isAsync, function(err, data) {
        return write(cache, data, isAsync, cb);
    });
}

/**
 * zlib interfaces
 */

function gunzip(buf, isAsync, cb) {
    if (isAsync) return zlib.gunzip(buf, cb);
    if (!syncZlib) return cb(null, buf);
    try {
        return cb(null, zlib.gunzipSync(buf));
    } catch (err) {
        return cb(err);
    }
}

function gzip(buf, isAsync, cb) {
    if (isAsync) return zlib.gzip(buf, cb);
    if (!syncZlib) return cb(null, buf);
    try {
        return cb(null, zlib.gzipSync(buf));
    } catch (err) {
        return cb(err);
    }
}

/**
 * filesystem interfaces
 */

function read(file, isAsync, cb) {
    if (isAsync) return fs.readFile(file, cb);
    try {
        return cb(null, fs.readFileSync(file));
    } catch(err) {
        return cb(err);
    }
}

function write(file, data, isAsync, cb) {
    if (isAsync) return fs.writeFile(file, data, cb);
    try {
        return cb(null, fs.writeFileSync(file, data));
    } catch(err) {
        return cb(err);
    }
}

/**
 * utils
 */

function formatCache(cacheDirectory, source, options, isAsync) {
    var hash, ext;

    if (!cacheDirectory) return;
    if (cacheDirectory === true) cacheDirectory = os.tmpdir();

    hash = crypto.createHash('SHA1');
    hash.end(JSON.stringify({
        loaderVersion: version,
        babelVersion: babel.version,
        source: source,
        options: options
    }));
    ext = isAsync || syncZlib ? '.gz.json' : '.json';
    return path.join(cacheDirectory, 'babel-loader-cache-' + hash.read().toString('hex') + ext);
}

function toBoolean(val) {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
}