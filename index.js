'use strict';

var assign = require('object-assign');
var babel = require('babel-core');
var loaderUtils = require('loader-utils');
var cache = require('./lib/fs-cache.js');
var exists = require('./lib/helpers/exists')();
var read = require('./lib/helpers/read')();
var resolveRc = require('./lib/resolve-rc.js');
var pkg = require('./package.json');
var path = require('path');

/**
 * Error thrown by Babel formatted to conform to Webpack reporting.
 */
function BabelLoaderError(name, message, codeFrame, hideStack, error) {
  Error.call(this);
  Error.captureStackTrace(this, BabelLoaderError);

  this.name = 'BabelLoaderError';
  this.message = formatMessage(name, message, codeFrame);
  this.hideStack = hideStack;
  this.error = error;
}

BabelLoaderError.prototype = Object.create(Error.prototype);
BabelLoaderError.prototype.constructor = BabelLoaderError;

var STRIP_FILENAME_RE = /^[^:]+: /;

var formatMessage = function(name, message, codeFrame) {
  return (name ? name + ': ' : '') + message + '\n\n' + codeFrame + '\n';
};

var transpile = function(source, options) {
  var result;
  try {
    result = babel.transform(source, options);
  } catch (error) {
    if (error.message && error.codeFrame) {
      var message = error.message;
      var name;
      var hideStack;
      if (error instanceof SyntaxError) {
        message = message.replace(STRIP_FILENAME_RE, '');
        name = 'SyntaxError';
        hideStack = true;
      } else if (error instanceof TypeError) {
        message = message.replace(STRIP_FILENAME_RE, '');
        hideStack = true;
      }
      throw new BabelLoaderError(
        name, message, error.codeFrame, hideStack, error);
    } else {
      throw error;
    }
  }
  var code = result.code;
  var map = result.map;
  var metadata = result.metadata;

  if (map && (!map.sourcesContent || !map.sourcesContent.length)) {
    map.sourcesContent = [source];
  }

  return {
    code: code,
    map: map,
    metadata: metadata
  };
};


function passMetadata(s, context, metadata) {
  //console.log("s:",s,"metadata:",metadata,"context:",context);
  if (context[s]) {
    //console.log("context function:",context[s].toString());
    context[s](metadata);
  }
}

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
    metadataSubscribers: [],
    inputSourceMap: inputSourceMap,
    sourceRoot: process.cwd(),
    filename: filename,
    cacheIdentifier: JSON.stringify({
      'babel-loader': pkg.version,
      'babel-core': babel.version,
      babelrc: exists(userOptions.babelrc) ?
          read(userOptions.babelrc) :
          resolveRc(path.dirname(filename)),
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
  var metadataSubscribers = options.metadataSubscribers;

  delete options.cacheDirectory;
  delete options.cacheIdentifier;
  delete options.metadataSubscribers;

  this.cacheable();
  var context = this;

  if (cacheDirectory) {
    var callback = this.async();
    return cache({
      directory: cacheDirectory,
      identifier: cacheIdentifier,
      source: source,
      options: options,
      transform: transpile,
    }, function(err, result) {
      if (err) { return callback(err); }
      metadataSubscribers.map(function (s) {passMetadata(s, context, result.metadata)});
      return callback(null, result.code, result.map);
    });
  }

  result = transpile(source, options);
  metadataSubscribers.map(function (s) {passMetadata(s, context, result.metadata)});
  this.callback(null, result.code, result.map);
};
