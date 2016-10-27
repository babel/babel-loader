/**
 * Filesystem cache
 *
 * Given a file and a transform function, cache the result into files
 * or retrieve the previously cached files if the given file is already known.
 *
 * @see https://github.com/babel/babel-loader/issues/34
 * @see https://github.com/babel/babel-loader/pull/41
 */
let crypto = require("crypto");
let mkdirp = require("mkdirp");
let findCacheDir = require("find-cache-dir");
let fs = require("fs");
let os = require("os");
let path = require("path");
let zlib = require("zlib");

/**
 * Read the contents from the compressed file.
 *
 * @async
 * @params {String} filename
 * @params {Function} callback
 */
let read = function(filename, callback) {
  return fs.readFile(filename, function(err, data) {
    if (err) { return callback(err); }

    return zlib.gunzip(data, function(err, content) {
      let result = {};

      if (err) { return callback(err); }

      try {
        result = JSON.parse(content);
      } catch (e) {
        return callback(e);
      }

      return callback(null, result);
    });
  });
};


/**
 * Write contents into a compressed file.
 *
 * @async
 * @params {String} filename
 * @params {String} result
 * @params {Function} callback
 */
let write = function(filename, result, callback) {
  let content = JSON.stringify(result);

  return zlib.gzip(content, function(err, data) {
    if (err) { return callback(err); }

    return fs.writeFile(filename, data, callback);
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
let filename = function(source, identifier, options) {
  let hash = crypto.createHash("SHA1");
  let contents = JSON.stringify({
    source: source,
    options: options,
    identifier: identifier,
  });

  hash.end(contents);

  return hash.read().toString("hex") + ".json.gzip";
};

/**
 * Retrieve file from cache, or create a new one for future reads
 *
 * @async
 * @param  {Object}   params
 * @param  {String}   params.directory  Directory to store cached files
 * @param  {String}   params.identifier Unique identifier to bust cache
 * @param  {String}   params.source   Original contents of the file to be cached
 * @param  {Object}   params.options  Options to be given to the transform fn
 * @param  {Function} params.transform  Function that will transform the
 *                                      original file and whose result will be
 *                                      cached
 *
 * @param  {Function<err, result>} callback
 *
 * @example
 *
 *   cache({
 *     directory: '.tmp/cache',
 *     identifier: 'babel-loader-cachefile',
 *     source: *source code from file*,
 *     options: {
 *       experimental: true,
 *       runtime: true
 *     },
 *     transform: function(source, options) {
 *       var content = *do what you need with the source*
 *       return content;
 *     }
 *   }, function(err, result) {
 *
 *   });
 */
module.exports = function(params, callback) {
  // Spread params into named variables
  // Forgive user whenever possible
  let source = params.source;
  let options = params.options || {};
  let transform = params.transform;
  let identifier = params.identifier;
  let directory;

  if (typeof params.directory === "string") {
    directory = params.directory;
  } else {
    directory = findCacheDir({ name: "babel-loader" }) || os.tmpdir();
  }

  let file = path.join(directory, filename(source, identifier, options));

  // Make sure the directory exists.
  return mkdirp(directory, function(err) {
    if (err) { return callback(err); }

    return read(file, function(err, content) {
      let result = {};
      // No errors mean that the file was previously cached
      // we just need to return it
      if (!err) { return callback(null, content); }

      // Otherwise just transform the file
      // return it to the user asap and write it in cache
      try {
        result = transform(source, options);
      } catch (error) {
        return callback(error);
      }

      return write(file, result, function(err) {
        return callback(err, result);
      });
    });
  });
};
