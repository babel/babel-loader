'use strict';

var assign = require('object-assign');
var loaderUtils = require('loader-utils');
var cache = require('./lib/fs-cache.js');
var exists = require('./lib/helpers/exists')();
var read = require('./lib/helpers/read')();
var resolveRc = require('./lib/resolve-rc.js');
var pkg = require('./package.json');
var path = require('path');
var ProcessPool = require('process-pool');
var os = require('os');

var pool = new ProcessPool({processLimit: os.cpus().length});
var transpile = pool.prepare(require('./lib/transpilerWorker'));

module.exports = function(source, inputSourceMap) {
  var result = {};

  // Handle filenames (#106)
  var webpackRemainingChain = loaderUtils.getRemainingRequest(this).split('!');
  var filename = webpackRemainingChain[webpackRemainingChain.length - 1];

  // Handle options
  var globalOptions = this.options.babel || {};
  var loaderOptions = loaderUtils.parseQuery(this.query);
  var userOptions = assign({}, globalOptions, loaderOptions);
  var defaultOptions = {
    inputSourceMap: inputSourceMap,
    sourceRoot: process.cwd(),
    filename: filename,
    cacheIdentifier: JSON.stringify({
      'babel-loader': pkg.version,
      'babel-core': require('babel-core').version,
      babelrc: exists(userOptions.babelrc) ?
          read(userOptions.babelrc) :
          resolveRc(process.cwd()),
      env: process.env.BABEL_ENV || process.env.NODE_ENV,
    }),
  };

  var options = assign({}, defaultOptions, userOptions);

  if (userOptions.sourceMap === undefined) {
    options.sourceMap = this.sourceMap;
  }

  if (options.sourceFileName === undefined) {
    options.sourceFileName = path.relative(
        options.sourceRoot,
        options.filename
    );
  }

  var cacheDirectory = options.cacheDirectory;
  var cacheIdentifier = options.cacheIdentifier;

  delete options.cacheDirectory;
  delete options.cacheIdentifier;

  this.cacheable();

  var callback = this.async();

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
  transpile(source, options).then(
    function(result) {
      callback(null, result.code, result.map);
    },
    callback
  );
};
