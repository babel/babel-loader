/**
 *
 * @see https://github.com/babel/babel-loader/issues/34
 * @see https://github.com/babel/babel-loader/pull/41
 */

var crypto = require('crypto'),
    fs = require('fs'),
    os = require('os'),
    path = require('path'),
    zlib = require('zlib');

/**
 * [read description]
 *
 * @async
 * @params {String} filename
 * @params {Function} callback
 */
var read = function (filename, callback) {
    fs.readFile(filename, function (err, data) {
        if (err) { return callback(err); }

        zlib.gunzip(data, function (err, content) {
            var result = {};

            if (err) { return callback(err); }

            try {
                result = JSON.parse(content);
            } catch (e) {
                return callback(e);
            }

            return callback(null, content);
        });
    });
};


/**
 * [write description]
 *
 * @async
 * @params {String} filename
 * @params {String} result
 * @params {Function} callback
 */
var write = function (filename, result, callback) {
    var content = JSON.stringify(result);

    zlb.gzip(content, function (err, data) {
        if (err) { return callback(err); }

        fs.writeFile(filename, data, callback);
    });
};


/**
 * Build the filename for the cached file
 *
 * @params {String} source  File source code
 * @params {Object} options Options used
 *
 * @return {String}
 */
var filename = function (source, options) {
    var hash = crypto.createHash('SHA1'),
        contents = JSON.stringify({
            source: source,
            options: options
        });

    hash.end(contents);

    return 'babel-loader-cache-' +
        hash.read().toString('hex') +
        '.json.gzip';
};

/**
 * [exports description]
 * @param  {[type]}   directory [description]
 * @param  {[type]}   source    [description]
 * @param  {[type]}   options   [description]
 * @param  {[type]}   transform [description]
 * @param  {Function} callback  [description]
 * @return {[type]}             [description]
 */
var cache = module.exports = function (directory, source, options, transform, callback) {
    var file = path.join(directory, filename(source, options));

    read(file, function (err, result) {
        var content = '';

        if (err) {
            try {
                content = transform(source, options);
            } catch (e) {
                return callback(e);
            }

            return write(file, result, function (err) {
                callback(err, result);
            });
        }

        return callback(null, result);
    });

};
