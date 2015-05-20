var assign = require('object-assign');
var babel = require('babel-core');
var cache = require('./lib/fs-cache.js');
var loaderUtils = require('loader-utils');
var pkg = require('./package.json');

var transpile = function(source, options) {
  var result = babel.transform(source, options);
  var code = result.code;
  var map = result.map;

  if (map) {
    map.sourcesContent = [source];
  }

  return {
    code: code,
    map: map,
  };
};

module.exports = function(source, inputSourceMap) {
  var callback = this.async();
  var result = {};
  // Handle options
  var defaultOptions = {
    inputSourceMap: inputSourceMap,
    filename: loaderUtils.getRemainingRequest(this),
    cacheIdentifier: JSON.stringify({
      'babel-loader': pkg.version,
      'babel-core': babel.version,
    }),
  };
  var globalOptions = this.options.babel;
  var loaderOptions = loaderUtils.parseQuery(this.query);
  var options = assign({}, defaultOptions, globalOptions, loaderOptions);

  if (options.sourceMap === undefined) {
    options.sourceMap = this.sourceMap;
  }

  cacheDirectory = options.cacheDirectory;
  cacheIdentifier = options.cacheIdentifier;

  delete options.cacheDirectory;
  delete options.cacheIdentifier;

  this.cacheable();

  if (cacheDirectory) {
    return cache({
      directory: cacheDirectory,
      identifier: cacheIdentifier,
      source: source,
      options: options,
      transform: transpile,
    }, function(err, result) {
      if (err) { return callback(err); }
      return callback(null, result.code, result.map);
    });
  }

  result = transpile(source, options);
  return callback(null, result.code, result.map);

};
