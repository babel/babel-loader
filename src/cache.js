// @ts-check
/**
 * Filesystem Cache
 *
 * Given a file and a transform function, cache the result into files
 * or retrieve the previously cached files if the given file is already known.
 *
 * @see https://github.com/babel/babel-loader/issues/34
 * @see https://github.com/babel/babel-loader/pull/41
 */
const nodeModule = require("node:module");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const { promisify } = require("util");
const { readFile, writeFile, mkdir } = require("fs/promises");
const { up: findUpSync } = require("empathic/find");
const { env } = process;
const transform = require("./transform");
const serialize = require("./serialize");
/**
 * @typedef {object} FileSystemInfoEntry
 * @property {number} safeTime
 * @property {number} timestamp
 */
/**
 * @typedef {object} WebpackLogger
 * @property {function(string): void} debug
 * @property {function(string): void} info
 * @property {function(string): void} warn
 * @property {function(string): void} error
 */
/**
 * @typedef {object} WebpackHash
 * @property {(data: string | Buffer, inputEncoding?: string) => WebpackHash} update
 * @property {(encoding?: string) => string | Buffer} digest
 */

/**
 * @type {string | null}
 */
let defaultCacheDirectory = null;

const gunzip = promisify(zlib.gunzip);
const gzip = promisify(zlib.gzip);

const findRootPackageJSON = () => {
  if (nodeModule.findPackageJSON) {
    return nodeModule.findPackageJSON("..", __filename);
  } else {
    // todo: remove this fallback when dropping support for Node.js < 22.14
    return findUpSync("package.json");
  }
};

/**
 * Read the contents from the compressed file.
 *
 * @async
 * @param {string} filename
 * @param {boolean} compress
 */
const read = async function (filename, compress) {
  const data = await readFile(filename + (compress ? ".gz" : ""));
  const content = compress ? await gunzip(data) : data;

  return JSON.parse(content.toString());
};

/**
 * Write contents into a compressed file.
 * @async
 * @param {string} filename
 * @param {boolean} compress
 * @param {any} result
 */
const write = async function (filename, compress, result) {
  const content = JSON.stringify(result);

  const data = compress ? await gzip(content) : content;
  return await writeFile(filename + (compress ? ".gz" : ""), data);
};

/**
 * Build the filename for the cached file
 * @param {string} source File source code
 * @param {string} identifier Unique identifier to bust cache
 * @param {Object} options Options used
 * @param {WebpackHash} hash Hash function returned by `LoaderContext.utils.createHash`
 * @return {string}
 */
const filename = function (source, identifier, options, hash) {
  hash.update(serialize([options, source, identifier]));

  return hash.digest("hex") + ".json";
};

/**
 * Add timestamps to external dependencies.
 * @async
 * @param {import("./transform").TransformResult["externalDependencies"]} externalDependencies
 * @param {(filename: string) => Promise<FileSystemInfoEntry>} getFileTimestamp
 */
const addTimestamps = async function (externalDependencies, getFileTimestamp) {
  for (const depAndEmptyTimestamp of externalDependencies) {
    try {
      const [dep] = depAndEmptyTimestamp;
      const { timestamp } = await getFileTimestamp(dep);
      depAndEmptyTimestamp.push(timestamp);
    } catch {
      // ignore errors if timestamp is not available
    }
  }
};

/**
 * Check if any external dependencies have been modified.
 * @async
 * @param {import("./transform").TransformResult["externalDependencies"]} externalDepsWithTimestamp
 * @param {(filename: string) => Promise<FileSystemInfoEntry>} getFileTimestamp
 * @returns {Promise<boolean>}
 */
const areExternalDependenciesModified = async function (
  externalDepsWithTimestamp,
  getFileTimestamp,
) {
  for (const depAndTimestamp of externalDepsWithTimestamp) {
    const [dep, timestamp] = depAndTimestamp;
    let newTimestamp;
    try {
      newTimestamp = (await getFileTimestamp(dep)).timestamp;
    } catch {
      return true;
    }
    if (timestamp !== newTimestamp) {
      return true;
    }
  }
  return false;
};

/**
 * Handle the cache
 * @async
 * @param {string} directory
 * @param {Object} params
 * @param {string} params.source The source code to transform.
 * @param {import(".").NormalizedOptions} [params.options] Options used for transformation.
 * @param {string} params.cacheIdentifier Unique identifier to bust cache.
 * @param {string} [params.cacheDirectory] Directory to store cached files.
 * @param {boolean} [params.cacheCompression] Whether to compress cached files.
 * @param {WebpackHash} params.hash Hash function to use for the cache filename.
 * @param {(filename: string) => Promise<FileSystemInfoEntry>} params.getFileTimestamp - Function to get file timestamps.
 * @param {WebpackLogger} params.logger
 * @returns {Promise<null | import("./transform").TransformResult>}
 */
const handleCache = async function (directory, params) {
  const {
    source,
    options = {},
    cacheIdentifier,
    cacheDirectory,
    cacheCompression,
    hash,
    getFileTimestamp,
    logger,
  } = params;

  const file = path.join(
    directory,
    filename(source, cacheIdentifier, options, hash),
  );

  try {
    // No errors mean that the file was previously cached
    // we just need to return it
    logger.debug(`reading cache file '${file}'`);
    const result = await read(file, cacheCompression);
    if (
      !(await areExternalDependenciesModified(
        result.externalDependencies,
        getFileTimestamp,
      ))
    ) {
      logger.debug(`validated cache file '${file}'`);
      return result;
    }
    logger.debug(
      `discarded cache file '${file}' due to changes in external dependencies`,
    );
  } catch {
    // continue if cache can't be read
    logger.debug(`discarded cache as it can not be read`);
  }

  const fallback =
    typeof cacheDirectory !== "string" && directory !== os.tmpdir();

  // Make sure the directory exists.
  try {
    // overwrite directory if exists
    logger.debug(`creating cache folder '${directory}'`);
    await mkdir(directory, { recursive: true });
  } catch (err) {
    if (fallback) {
      return handleCache(os.tmpdir(), params);
    }

    throw err;
  }

  // Otherwise just transform the file
  // return it to the user asap and write it in cache
  logger.debug(`applying Babel transform`);
  const result = await transform(source, options);
  if (!result) {
    logger.debug(`no result from Babel transform, skipping cache write`);
    return null;
  }
  await addTimestamps(result.externalDependencies, getFileTimestamp);

  try {
    logger.debug(`writing result to cache file '${file}'`);
    await write(file, cacheCompression, result);
  } catch (err) {
    if (fallback) {
      // Fallback to tmpdir if node_modules folder not writable
      return handleCache(os.tmpdir(), params);
    }

    throw err;
  }

  return result;
};

/**
 * Retrieve file from cache, or create a new one for future reads
 * @async
 * @param {object} params
 * @param {string} params.cacheDirectory Directory to store cached files.
 * @param {string} params.cacheIdentifier Unique identifier to bust cache.
 * @param {boolean} params.cacheCompression Whether compressing cached files.
 * @param {string} params.source Original contents of the file to be cached.
 * @param {import(".").NormalizedOptions} params.options Options to be given to the transform function.
 * @param {function} params.transform Transform function to apply to the file.
 * @param {WebpackHash} params.hash Hash function to use for the cache filename.
 * @param {function(string): Promise<FileSystemInfoEntry>} params.getFileTimestamp Function to get file timestamps.
 * @param {WebpackLogger} params.logger Logger instance.
 *
 * @example
 *
 *   const result = await cache({
 *     cacheDirectory: '.tmp/cache',
 *     cacheIdentifier: 'babel-loader-cachefile',
 *     cacheCompression: false,
 *     source: *source code from file*,
 *     options: {
 *       experimental: true,
 *       runtime: true
 *     },
 *   });
 */

module.exports = async function cache(params) {
  let directory;

  if (typeof params.cacheDirectory === "string") {
    directory = params.cacheDirectory;
  } else {
    defaultCacheDirectory ??= findCacheDir("babel-loader");
    directory = defaultCacheDirectory;
  }

  return await handleCache(directory, params);
};

/**
 * Find the cache directory for babel-loader.
 * @param {string} name "babel-loader"
 * @returns {string}
 */
function findCacheDir(name) {
  if (env.CACHE_DIR && !["true", "false", "1", "0"].includes(env.CACHE_DIR)) {
    return path.join(env.CACHE_DIR, name);
  }
  const rootPkgJSONPath = findRootPackageJSON();
  if (rootPkgJSONPath) {
    return path.join(
      path.dirname(rootPkgJSONPath),
      "node_modules",
      ".cache",
      name,
    );
  }
  return os.tmpdir();
}
