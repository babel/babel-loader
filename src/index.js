const babel = require("@babel/core");
const loaderUtils = require("loader-utils");
const path = require("path");
const cache = require("./fs-cache.js");
const exists = require("./utils/exists");
const relative = require("./utils/relative");
const read = require("./utils/read");
const resolveRc = require("./resolve-rc.js");
const pkg = require("../package.json");
const fs = require("fs");

/**
 * Error thrown by Babel formatted to conform to Webpack reporting.
 */
function BabelLoaderError(name, message, codeFrame, hideStack, error) {
  Error.call(this);

  this.name = "BabelLoaderError";
  this.message = formatMessage(name, message, codeFrame);
  this.hideStack = hideStack;
  this.error = error;

  Error.captureStackTrace(this, BabelLoaderError);
}

BabelLoaderError.prototype = Object.create(Error.prototype);
BabelLoaderError.prototype.constructor = BabelLoaderError;

const STRIP_FILENAME_RE = /^[^:]+: /;

const formatMessage = function(name, message, codeFrame) {
  return (name ? name + ": " : "") + message + "\n\n" + codeFrame + "\n";
};

const transpile = function(source, options) {
  const forceEnv = options.forceEnv;
  let tmpEnv;

  delete options.forceEnv;

  if (forceEnv) {
    tmpEnv = process.env.BABEL_ENV;
    process.env.BABEL_ENV = forceEnv;
  }

  let result;
  try {
    result = babel.transform(source, options);
  } catch (error) {
    if (forceEnv) restoreBabelEnv(tmpEnv);
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
        name,
        message,
        error.codeFrame,
        hideStack,
        error,
      );
    } else {
      throw error;
    }
  }
  const code = result.code;
  const map = result.map;
  const metadata = result.metadata;

  if (map && (!map.sourcesContent || !map.sourcesContent.length)) {
    map.sourcesContent = [source];
  }

  if (forceEnv) restoreBabelEnv(tmpEnv);

  return {
    code: code,
    map: map,
    metadata: metadata,
  };
};

function restoreBabelEnv(prevValue) {
  if (prevValue === undefined) {
    delete process.env.BABEL_ENV;
  } else {
    process.env.BABEL_ENV = prevValue;
  }
}

function passMetadata(s, context, metadata) {
  if (context[s]) {
    context[s](metadata);
  }
}

module.exports = function(source, inputSourceMap) {
  // Handle filenames (#106)
  const webpackRemainingChain = loaderUtils
    .getRemainingRequest(this)
    .split("!");
  const filename = webpackRemainingChain[webpackRemainingChain.length - 1];

  // Handle options
  const loaderOptions = loaderUtils.getOptions(this) || {};
  const fileSystem = this.fs ? this.fs : fs;
  let babelrcPath = null;
  if (loaderOptions.babelrc !== false) {
    babelrcPath =
      typeof loaderOptions.babelrc === "string" &&
      exists(fileSystem, loaderOptions.babelrc)
        ? loaderOptions.babelrc
        : resolveRc(fileSystem, path.dirname(filename));
  }

  if (babelrcPath) {
    this.addDependency(babelrcPath);
  }

  const defaultOptions = {
    metadataSubscribers: [],
    inputSourceMap: inputSourceMap,
    sourceRoot: process.cwd(),
    filename: filename,
    cacheIdentifier: JSON.stringify({
      "@babel/loader": pkg.version,
      "@babel/core": babel.version,
      babelrc: babelrcPath ? read(fileSystem, babelrcPath) : null,
      env:
        loaderOptions.forceEnv ||
        process.env.BABEL_ENV ||
        process.env.NODE_ENV ||
        "development",
    }),
  };

  const options = Object.assign({}, defaultOptions, loaderOptions);

  if (loaderOptions.sourceMap === undefined) {
    options.sourceMap = this.sourceMap;
  }

  if (options.sourceFileName === undefined) {
    options.sourceFileName = relative(options.sourceRoot, options.filename);
  }

  const cacheDirectory = options.cacheDirectory;
  const cacheIdentifier = options.cacheIdentifier;
  const metadataSubscribers = options.metadataSubscribers;

  delete options.cacheDirectory;
  delete options.cacheIdentifier;
  delete options.metadataSubscribers;

  if (cacheDirectory) {
    const callback = this.async();
    return cache(
      {
        directory: cacheDirectory,
        identifier: cacheIdentifier,
        source: source,
        options: options,
        transform: transpile,
      },
      (err, { code, map, metadata } = {}) => {
        if (err) return callback(err);

        metadataSubscribers.forEach(s => passMetadata(s, this, metadata));

        return callback(null, code, map);
      },
    );
  }

  const { code, map, metadata } = transpile(source, options);

  metadataSubscribers.forEach(s => passMetadata(s, this, metadata));

  this.callback(null, code, map);
};
