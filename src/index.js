let fs = require("fs");
const path = require("path");

const rc = require("./config.js");
const pkg = require("../package.json");
const cache = require("./cache.js");
const transform = require("./transform.js");

const read = require("./utils/read.js");
const exists = require("./utils/exists.js");
const relative = require("./utils/relative.js");

const loaderUtils = require("loader-utils");

function subscribe(subscriber, metadata, context) {
  if (context[subscriber]) {
    context[subscriber](metadata);
  }
}

module.exports = function loader(source, inputSourceMap) {
  const filename = this.resourcePath;

  let options = loaderUtils.getOptions(this) || {};

  // Use memoryFS (webpack) if available
  fs = this.fs ? this.fs : fs;

  let babelrc = null;

  // Deprecation handling
  if ("forceEnv" in options) {
    console.warn(
      "The option `forceEnv` has been removed in favor of `envName` in Babel 7.",
    );
  }
  if (typeof options.babelrc === "string") {
    console.warn(
      "The option `babelrc` should not be set to a string anymore in the babel-loader config. " +
        "Please update your configuration and set `babelrc` to true or false.\n" +
        "If you want to specify a specific babel config file to inherit config from " +
        "please use the `extends` option.\nFor more information about this options see " +
        "https://babeljs.io/docs/core-packages/#options",
    );
  }
  if (options.babelrc !== false) {
    babelrc =
      options.extends && exists(fs, options.extends)
        ? options.extends
        : rc(fs, path.dirname(filename));
  }

  if (babelrc) {
    this.addDependency(babelrc);
  }

  const defaults = {
    filename,
    inputSourceMap: inputSourceMap || undefined,
    sourceRoot: process.cwd(),
    cacheIdentifier: JSON.stringify({
      env:
        options.envName ||
        process.env.BABEL_ENV ||
        process.env.NODE_ENV ||
        "development",
      options,
      babelrc: babelrc ? read(fs, babelrc) : null,
      "@babel/core": transform.version,
      "@babel/loader": pkg.version,
    }),
    metadataSubscribers: [],
  };

  options = Object.assign({}, defaults, options);

  if (options.sourceMap === undefined) {
    options.sourceMap = this.sourceMap;
  }

  if (options.sourceFileName === undefined) {
    options.sourceFileName = relative(options.sourceRoot, options.filename);
  }

  const cacheDirectory = options.cacheDirectory;
  const cacheIdentifier = options.cacheIdentifier;
  const metadataSubscribers = options.metadataSubscribers;
  // Remove loader related options
  delete options.cacheDirectory;
  delete options.cacheIdentifier;
  delete options.metadataSubscribers;
  // Make the loader async
  const callback = this.async();

  if (cacheDirectory) {
    return cache(
      { source, options, transform, cacheDirectory, cacheIdentifier },
      (err, { code, map, metadata } = {}) => {
        if (err) return callback(err);

        metadataSubscribers.forEach(subscriber => {
          subscribe(subscriber, metadata, this);
        });

        return callback(null, code, map);
      },
    );
  }

  return transform(source, options, (err, { code, map, metadata } = {}) => {
    if (err) return callback(err);

    metadataSubscribers.forEach(subscriber => {
      subscribe(subscriber, metadata, this);
    });

    return callback(null, code, map);
  });
};
