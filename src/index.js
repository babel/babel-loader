// @ts-check
/**
 * @typedef {object} LoaderOnlyOptions
 * @property {string} [cacheDirectory] Directory to store cached files.
 * @property {string} [cacheIdentifier] Unique identifier to bust cache.
 * @property {boolean} [cacheCompression] Whether to compress cached files.
 * @property {string} [customize] The absolute path of a file that exports a BabelLoaderWrapper.
 * @property {Array<string>} [metadataSubscribers] Names of subscribers registered in the loader context.
 */

/**
 * @typedef {import("webpack").LoaderContext<LoaderOptions>} BabelLoaderContext
 * @typedef {string} BabelLoaderSource Parameters<import("webpack").LoaderDefinitionFunction>[0]
 * @typedef {string} BabelLoaderInputSourceMap Parameters<import("webpack").LoaderDefinitionFunction>[1]
 *
 * @todo Consider exporting these types from @babel/core
 * @typedef {Awaited<ReturnType<import("@babel/core").loadPartialConfigAsync>>} PartialConfig
 * @typedef {PartialConfig['options']} NormalizedOptions
 */

/**
 * @typedef {(babel: typeof import("@babel/core")) => BabelOverrideHooks} BabelLoaderWrapper
 * @typedef {object} BabelOverrideHooks
 * @property {(this: BabelLoaderContext, loaderOptions: LoaderOptions, params: { source: BabelLoaderSource, map: BabelLoaderInputSourceMap }) => Promise<{ custom: any, loader: LoaderOptions }>} customOptions
 * @property {(this: BabelLoaderContext, config: PartialConfig, params: { source: BabelLoaderSource, map: BabelLoaderInputSourceMap, customOptions: any }) => Promise<PartialConfig['options']>} config
 * @property {(this: BabelLoaderContext, result: import("./transform").TransformResult, params: { source: BabelLoaderSource, map: BabelLoaderInputSourceMap, customOptions: any, config: PartialConfig, options: PartialConfig['options'] }) => Promise<import("./transform").TransformResult>} result
 */
/**
 * @typedef {import("@babel/core").InputOptions & LoaderOnlyOptions} LoaderOptions
 */

/**
 * @type {import("@babel/core")}
 */
let babel;
try {
  babel = require("@babel/core");
} catch (err) {
  if (err.code === "MODULE_NOT_FOUND") {
    err.message +=
      "\n babel-loader@9 requires Babel 7.12+ (the package '@babel/core'). " +
      "If you'd like to use Babel 6.x ('babel-core'), you should install 'babel-loader@7'.";
  }
  throw err;
}

// Since we've got the reverse bridge package at @babel/core@6.x, give
// people useful feedback if they try to use it alongside babel-loader.
if (/^6\./.test(babel.version)) {
  throw new Error(
    "\n babel-loader@9 will not work with the '@babel/core@6' bridge package. " +
      "If you want to use Babel 6.x, install 'babel-loader@7'.",
  );
}

const { version } = require("../package.json");
const cache = require("./cache");
const transform = require("./transform");
const injectCaller = require("./injectCaller");
const schema = require("./schema.json");

const { isAbsolute } = require("path");
const { promisify } = require("util");

/**
 * Invoke a metadata subscriber registered in the loader context.
 * @param {string} subscriber
 * @param {unknown} metadata
 * @param {import("webpack").LoaderContext<LoaderOptions>} context
 */
function subscribe(subscriber, metadata, context) {
  // @ts-expect-error subscriber is a custom function
  if (context[subscriber]) {
    // @ts-expect-error subscriber is a custom function
    context[subscriber](metadata);
  }
}

module.exports = makeLoader();
module.exports.custom = makeLoader;

/**
 * @param {BabelLoaderWrapper} [callback]
 */
function makeLoader(callback) {
  const overrides = callback ? callback(babel) : undefined;

  /**
   * @this {BabelLoaderContext}
   * @param {BabelLoaderSource} source
   * @param {BabelLoaderInputSourceMap} inputSourceMap
   */
  const webpackLoader = function (source, inputSourceMap) {
    // Make the loader async
    const callback = this.async();

    loader.call(this, source, inputSourceMap, overrides).then(
      // @ts-expect-error (FixMe): Argument of type 'string | EncodedSourceMap' is not assignable to parameter of type 'string | Buffer<ArrayBufferLike>'.
      args => callback(null, ...args),
      err => callback(err),
    );
  };

  return webpackLoader;
}

/**
 * Babel loader
 * @this {BabelLoaderContext}
 * @param {BabelLoaderSource} source The source code to transform
 * @param {BabelLoaderInputSourceMap} inputSourceMap
 * @param {BabelOverrideHooks} overrides
 * @returns
 */
async function loader(source, inputSourceMap, overrides) {
  const filename = this.resourcePath;
  const logger = this.getLogger("babel-loader");

  // @ts-expect-error TS does not treat schema.json/properties/cacheDirectory/type as a constant string literal
  let loaderOptions = this.getOptions(schema);

  if (loaderOptions.customize != null) {
    if (!isAbsolute(loaderOptions.customize)) {
      throw new Error(
        "Customized loaders must be passed as absolute paths, since " +
          "babel-loader has no way to know what they would be relative to.",
      );
    }
    if (overrides) {
      throw new Error(
        "babel-loader's 'customize' option is not available when already " +
          "using a customized babel-loader wrapper.",
      );
    }

    logger.debug(`loading customize override: '${loaderOptions.customize}'`);

    let override = require(loaderOptions.customize);
    if (override.__esModule) override = override.default;

    if (typeof override !== "function") {
      throw new Error("Custom overrides must be functions.");
    }
    logger.debug("applying customize override to @babel/core");
    overrides = override(babel);
  }

  let customOptions;
  if (overrides && overrides.customOptions) {
    logger.debug("applying overrides customOptions() to loader options");
    const result = await overrides.customOptions.call(this, loaderOptions, {
      source,
      map: inputSourceMap,
    });
    customOptions = result.custom;
    loaderOptions = result.loader;
  }

  // Deprecation handling
  if ("forceEnv" in loaderOptions) {
    this.emitWarning(
      new Error(
        "The option `forceEnv` has been removed in favor of `envName` in Babel 7.",
      ),
    );
  }
  if (typeof loaderOptions.babelrc === "string") {
    this.emitWarning(
      new Error(
        "The option `babelrc` should not be set to a string anymore in the babel-loader config. " +
          "Please update your configuration and set `babelrc` to true or false.\n" +
          "If you want to specify a specific babel config file to inherit config from " +
          "please use the `extends` option.\nFor more information about this options see " +
          "https://babeljs.io/docs/#options",
      ),
    );
  }

  logger.debug("normalizing loader options");
  // Standardize on 'sourceMaps' as the key passed through to Webpack, so that
  // users may safely use either one alongside our default use of
  // 'this.sourceMap' below without getting error about conflicting aliases.
  if (
    Object.prototype.hasOwnProperty.call(loaderOptions, "sourceMap") &&
    !Object.prototype.hasOwnProperty.call(loaderOptions, "sourceMaps")
  ) {
    loaderOptions = Object.assign({}, loaderOptions, {
      sourceMaps: loaderOptions.sourceMap,
    });
    delete loaderOptions.sourceMap;
  }

  const programmaticOptions = Object.assign({}, loaderOptions, {
    filename,
    inputSourceMap: inputSourceMap || loaderOptions.inputSourceMap,

    // Set the default sourcemap behavior based on Webpack's mapping flag,
    // but allow users to override if they want.
    sourceMaps:
      loaderOptions.sourceMaps === undefined
        ? this.sourceMap
        : loaderOptions.sourceMaps,

    // Ensure that Webpack will get a full absolute path in the sourcemap
    // so that it can properly map the module back to its internal cached
    // modules.
    sourceFileName: filename,
  });
  // Remove loader related options
  delete programmaticOptions.customize;
  delete programmaticOptions.cacheDirectory;
  delete programmaticOptions.cacheIdentifier;
  delete programmaticOptions.cacheCompression;
  delete programmaticOptions.metadataSubscribers;

  logger.debug("resolving Babel configs");
  const config = await babel.loadPartialConfigAsync(
    injectCaller(programmaticOptions, this.target),
  );
  if (config) {
    let options = config.options;
    if (overrides && overrides.config) {
      logger.debug("applying overrides config() to Babel config");
      options = await overrides.config.call(this, config, {
        source,
        map: inputSourceMap,
        customOptions,
      });
    }

    if (options.sourceMaps === "inline") {
      // Babel has this weird behavior where if you set "inline", we
      // inline the sourcemap, and set 'result.map = null'. This results
      // in bad behavior from Babel since the maps get put into the code,
      // which Webpack does not expect, and because the map we return to
      // Webpack is null, which is also bad. To avoid that, we override the
      // behavior here so "inline" just behaves like 'true'.
      options.sourceMaps = true;
    }

    const {
      cacheDirectory = null,
      cacheIdentifier = "core" + transform.version + "," + "loader" + version,
      cacheCompression = true,
      metadataSubscribers = [],
    } = loaderOptions;

    /**
     * @type {import("./transform").TransformResult}
     */
    let result;
    if (cacheDirectory) {
      logger.debug("cache is enabled");
      const getFileTimestamp = promisify(
        /**
         * @param {string} path
         * @param {(err: import("webpack").WebpackError | null, fileTimestamp: import("./cache").FileSystemInfoEntry) => void} cb
         */
        (path, cb) => {
          this._compilation.fileSystemInfo.getFileTimestamp(path, cb);
        },
      );
      const hash = this.utils.createHash(
        this._compilation.outputOptions.hashFunction,
      );
      result = await cache({
        source,
        options,
        transform,
        cacheDirectory,
        cacheIdentifier,
        cacheCompression,
        hash,
        getFileTimestamp,
        logger,
      });
    } else {
      logger.debug("cache is disabled, applying Babel transform");
      result = await transform(source, options);
    }

    config.files.forEach(configFile => {
      this.addDependency(configFile);
      logger.debug(`added '${configFile}' to webpack dependencies`);
    });

    if (result) {
      if (overrides && overrides.result) {
        logger.debug("applying overrides result() to Babel transform results");
        result = await overrides.result.call(this, result, {
          source,
          map: inputSourceMap,
          customOptions,
          config,
          options,
        });
      }

      const { code, map, metadata, externalDependencies } = result;

      externalDependencies?.forEach(([dep]) => {
        this.addDependency(dep);
        logger.debug(`added '${dep}' to webpack dependencies`);
      });
      metadataSubscribers.forEach(subscriber => {
        subscribe(subscriber, metadata, this);
        logger.debug(`invoked metadata subscriber '${String(subscriber)}'`);
      });

      return [code, map];
    }
  }

  // If the file was ignored, pass through the original content.
  return [source, inputSourceMap];
}
