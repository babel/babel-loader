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
const LoaderError = require("./Error");

const STRIP_FILENAME_RE = /^[^:]+: /;

function transpile(source, options) {
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
  } catch (err) {
    if (forceEnv) restoreBabelEnv(tmpEnv);

    if (err.message && err.codeFrame) {
      let hideStack;

      if (err instanceof SyntaxError) {
        err.name = "SyntaxError";
        err.message = err.message.replace(STRIP_FILENAME_RE, "");

        hideStack = true;
      } else if (err instanceof TypeError) {
        err.message = err.message.replace(STRIP_FILENAME_RE, "");

        hideStack = true;
      }

      throw new LoaderError(err, hideStack);
    } else {
      throw err;
    }
  }

  const { code, map, metadata } = result;

  if (map && (!map.sourcesContent || !map.sourcesContent.length)) {
    map.sourcesContent = [source];
  }

  if (forceEnv) restoreBabelEnv(tmpEnv);

  return { code, map, metadata };
}

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
  const callback = this.async();
  const filename = this.resourcePath;

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
