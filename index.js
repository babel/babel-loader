'use strict';

const assign = require('object-assign');
const babel = require('babel-core');
const loaderUtils = require('loader-utils');
const cache = require('./lib/fs-cache.js');
const exists = require('./lib/helpers/exists')();
const read = require('./lib/helpers/read')();
const resolveRc = require('./lib/resolve-rc.js');
const pkg = require('./package.json');
const path = require('path');

const transpile = function(source, options) {
  const result = babel.transform(source, options);
  const code = result.code;
  const map = result.map;

  if (map && (!map.sourcesContent || !map.sourcesContent.length)) {
    map.sourcesContent = [source];
  }

  return {
    code: code,
    map: map,
  };
};

module.exports = function(source, inputSourceMap) {
  let result = {};

  // Handle filenames (#106)
  const webpackRemainingChain = loaderUtils.getRemainingRequest(this).split('!');
  const filename = webpackRemainingChain[webpackRemainingChain.length - 1];

  // Handle options
  const globalOptions = this.options.babel || {};
  const loaderOptions = loaderUtils.parseQuery(this.query);
  const userOptions = assign({}, globalOptions, loaderOptions);
  const defaultOptions = {
    inputSourceMap: inputSourceMap,
    sourceRoot: process.cwd(),
    filename: filename,
    cacheIdentifier: JSON.stringify({
      'babel-loader': pkg.version,
      'babel-core': babel.version,
      babelrc: exists(userOptions.babelrc) ?
        read(userOptions.babelrc) : resolveRc(path.dirname(filename)),
      env: process.env.BABEL_ENV || process.env.NODE_ENV,
    }),
  };

  const options = assign({}, defaultOptions, userOptions);

  if (userOptions.sourceMap === undefined) {
    options.sourceMap = this.sourceMap;
  }

  if (options.sourceFileName === undefined) {
    options.sourceFileName = path.relative(
      options.sourceRoot,
      options.filename
    );
  }

  const cacheDirectory = options.cacheDirectory;
  const cacheIdentifier = options.cacheIdentifier;

  delete options.cacheDirectory;
  delete options.cacheIdentifier;

  this.cacheable();

  if (cacheDirectory) {
    let callback = this.async();
    return cache({
      directory: cacheDirectory,
      identifier: cacheIdentifier,
      source: source,
      options: options,
      transform: transpile,
    }, function(err, result) {
      if (err) {
        return callback(err);
      }
      return callback(null, result.code, result.map);
    });
  }

  result = transpile(source, options);
  this.callback(null, result.code, result.map);
};
