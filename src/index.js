let assign = require("object-assign");
let babel = require("babel-core");
let loaderUtils = require("loader-utils");
let path = require("path");
let cache = require("./fs-cache.js");
let exists = require("./helpers/exists")();
let read = require("./helpers/read")();
let resolveRc = require("./resolve-rc.js");
let pkg = require("./../package.json");

/**
 * Error thrown by Babel formatted to conform to Webpack reporting.
 */
function BabelLoaderError(name, message, codeFrame, hideStack, error) {
  Error.call(this);
  Error.captureStackTrace(this, BabelLoaderError);

  this.name = "BabelLoaderError";
  this.message = formatMessage(name, message, codeFrame);
  this.hideStack = hideStack;
  this.error = error;
}

BabelLoaderError.prototype = Object.create(Error.prototype);
BabelLoaderError.prototype.constructor = BabelLoaderError;

let STRIP_FILENAME_RE = /^[^:]+: /;

let formatMessage = function(name, message, codeFrame) {
  return (name ? name + ": " : "") + message + "\n\n" + codeFrame + "\n";
};

let transpile = function(source, options) {
  let result;
  try {
    result = babel.transform(source, options);
  } catch (error) {
    if (error.message && error.codeFrame) {
      let message = error.message;
      let name;
      let hideStack;
      if (error instanceof SyntaxError) {
        message = message.replace(STRIP_FILENAME_RE, "");
        name = "SyntaxError";
        hideStack = true;
      } else if (error instanceof TypeError) {
        message = message.replace(STRIP_FILENAME_RE, "");
        hideStack = true;
      }
      throw new BabelLoaderError(
        name, message, error.codeFrame, hideStack, error);
    } else {
      throw error;
    }
  }
  let code = result.code;
  let map = result.map;

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
  let webpackRemainingChain = loaderUtils.getRemainingRequest(this).split("!");
  let filename = webpackRemainingChain[webpackRemainingChain.length - 1];

  // Handle options
  let globalOptions = this.options.babel || {};
  let loaderOptions = loaderUtils.parseQuery(this.query);
  let userOptions = assign({}, globalOptions, loaderOptions);
  let defaultOptions = {
    inputSourceMap: inputSourceMap,
    sourceRoot: process.cwd(),
    filename: filename,
    cacheIdentifier: JSON.stringify({
      "babel-loader": pkg.version,
      "babel-core": babel.version,
      babelrc: exists(userOptions.babelrc) ?
          read(userOptions.babelrc) :
          resolveRc(path.dirname(filename)),
      env: process.env.BABEL_ENV || process.env.NODE_ENV,
    }),
  };

  let options = assign({}, defaultOptions, userOptions);

  if (userOptions.sourceMap === undefined) {
    options.sourceMap = this.sourceMap;
  }

  if (options.sourceFileName === undefined) {
    options.sourceFileName = path.relative(
        options.sourceRoot,
        options.filename
    );
  }

  let cacheDirectory = options.cacheDirectory;
  let cacheIdentifier = options.cacheIdentifier;

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
      if (err) { return callback(err); }
      return callback(null, result.code, result.map);
    });
  }

  result = transpile(source, options);
  this.callback(null, result.code, result.map);
};
