const babel = require("@babel/core");

const pkg = require("../package.json");
const cache = require("./cache");
const transform = require("./transform");

const relative = require("./utils/relative");

const loaderUtils = require("loader-utils");

function subscribe(subscriber, metadata, context) {
  if (context[subscriber]) {
    context[subscriber](metadata);
  }
}

module.exports = makeLoader();
module.exports.custom = makeLoader;

function makeLoader(callback) {
  const overrides = callback ? callback(babel) : undefined;

  return function(source, inputSourceMap) {
    // Make the loader async
    const callback = this.async();

    loader
      .call(this, source, inputSourceMap, overrides)
      .then(args => callback(null, ...args), err => callback(err));
  };
}

async function loader(source, inputSourceMap, overrides) {
  const filename = this.resourcePath;

  let loaderOptions = loaderUtils.getOptions(this) || {};

  let customOptions;
  if (overrides && overrides.customOptions) {
    const result = await overrides.customOptions.call(this, loaderOptions);
    customOptions = result.custom;
    loaderOptions = result.loader;
  }

  // Deprecation handling
  if ("forceEnv" in loaderOptions) {
    console.warn(
      "The option `forceEnv` has been removed in favor of `envName` in Babel 7.",
    );
  }
  if (typeof loaderOptions.babelrc === "string") {
    console.warn(
      "The option `babelrc` should not be set to a string anymore in the babel-loader config. " +
        "Please update your configuration and set `babelrc` to true or false.\n" +
        "If you want to specify a specific babel config file to inherit config from " +
        "please use the `extends` option.\nFor more information about this options see " +
        "https://babeljs.io/docs/core-packages/#options",
    );
  }

  // Set babel-loader's default options.
  const {
    sourceRoot = process.cwd(),
    sourceMap = this.sourceMap,
    sourceFileName = relative(sourceRoot, filename),
  } = loaderOptions;

  const programmaticOptions = Object.assign({}, loaderOptions, {
    filename,
    inputSourceMap: inputSourceMap || undefined,
    sourceRoot,
    sourceMap,
    sourceFileName,
  });
  // Remove loader related options
  delete programmaticOptions.cacheDirectory;
  delete programmaticOptions.cacheIdentifier;
  delete programmaticOptions.metadataSubscribers;

  if (!babel.loadPartialConfig) {
    throw new Error(
      `babel-loader ^8.0.0-beta.3 requires @babel/core@7.0.0-beta.41, but ` +
        `you appear to be using "${babel.version}". Either update your ` +
        `@babel/core version, or pin you babel-loader version to 8.0.0-beta.2`,
    );
  }

  if (this.version > 1 && programmaticOptions.presets) {
    programmaticOptions.presets.forEach((preset, i) => {
      let name = preset;
      let opts = {};
      if (Array.isArray(preset)) {
        name = preset[0];
        opts = preset[1];
      }
      if (
        ["env", "babel-preset-env", "@babel/preset-env"].includes(name) &&
        (!opts || (opts && !opts.hasOwnProperty("modules")))
      ) {
        const newOpts = { modules: false };
        if (Array.isArray(preset)) {
          preset[1] = Object.assign({}, opts, newOpts);
        } else {
          programmaticOptions.presets[i] = [name, newOpts];
        }
      }
    });
  }

  const config = babel.loadPartialConfig(programmaticOptions);
  if (config) {
    let options = config.options;
    if (overrides && overrides.config) {
      options = await overrides.config.call(this, config, {
        source,
        customOptions,
      });
    }

    const {
      cacheDirectory = null,
      cacheIdentifier = JSON.stringify({
        options,
        "@babel/core": transform.version,
        "@babel/loader": pkg.version,
      }),
      metadataSubscribers = [],
    } = loaderOptions;

    let result;
    if (cacheDirectory) {
      result = await cache({
        source,
        options,
        transform,
        cacheDirectory,
        cacheIdentifier,
      });
    } else {
      result = await transform(source, options);
    }

    // TODO: Babel should really provide the full list of config files that
    // were used so that this can also handle files loaded with 'extends'.
    if (typeof config.babelrc === "string") {
      this.addDependency(config.babelrc);
    }

    if (result) {
      if (overrides && overrides.result) {
        result = await overrides.result.call(this, result, {
          source,
          customOptions,
          config,
          options,
        });
      }

      const { code, map, metadata } = result;

      metadataSubscribers.forEach(subscriber => {
        subscribe(subscriber, metadata, this);
      });

      return [code, map];
    }
  }

  // If the file was ignored, pass through the original content.
  return [source, inputSourceMap];
}
