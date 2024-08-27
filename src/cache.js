/**
 * Filesystem Cache
 *
 * Given a file and a transform function, cache the result into files
 * or retrieve the previously cached files if the given file is already known.
 *
 * @see https://github.com/babel/babel-loader/issues/34
 * @see https://github.com/babel/babel-loader/pull/41
 */
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const { promisify } = require("util");
const { readFile, writeFile, mkdir } = require("fs/promises");
// Lazily instantiated when needed
const findCacheDirP = import("find-cache-dir");

const transform = require("./transform");
const serialize = require("./serialize");
let defaultCacheDirectory = null;

const gunzip = promisify(zlib.gunzip);
const gzip = promisify(zlib.gzip);

/**
 * Read the contents from the compressed file.
 *
 * @async
 * @params {String} filename
 * @params {Boolean} compress
 */
const read = async function (filename, compress) {
  const data = await readFile(filename + (compress ? ".gz" : ""));
  const content = compress ? await gunzip(data) : data;

  return JSON.parse(content.toString());
};

/**
 * Write contents into a compressed file.
 *
 * @async
 * @params {String} filename
 * @params {Boolean} compress
 * @params {String} result
 */
const write = async function (filename, compress, result) {
  const content = JSON.stringify(result);

  const data = compress ? await gzip(content) : content;
  return await writeFile(filename + (compress ? ".gz" : ""), data);
};

/**
 * Build the filename for the cached file
 *
 * @params {String} source  File source code
 * @params {Object} options Options used
 *
 * @return {String}
 */
const filename = function (source, identifier, options, hash) {
  hash.update(serialize([options, source, identifier]));

  return hash.digest("hex") + ".json";
};

const handleExternalDepedencies = async function (
  externalDependencies,
  getFileTimestamp,
) {
  for (const depAndEmptyTimestamp of externalDependencies) {
    try {
      const [dep] = depAndEmptyTimestamp;
      const { timestamp } = await getFileTimestamp(dep);
      depAndEmptyTimestamp.push(timestamp);
    } catch {
      // ignore errors if timestamp is not available
    }
  }
  return externalDependencies;
};

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
 *
 * @params {String} directory
 * @params {Object} params
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
  } = params;

  const file = path.join(
    directory,
    filename(source, cacheIdentifier, options, hash),
  );

  try {
    // No errors mean that the file was previously cached
    // we just need to return it
    const result = await read(file, cacheCompression);
    if (
      !(await areExternalDependenciesModified(
        result.externalDependencies,
        getFileTimestamp,
      ))
    ) {
      return result;
    }
  } catch {
    // conitnue if cache can't be read
  }

  const fallback =
    typeof cacheDirectory !== "string" && directory !== os.tmpdir();

  // Make sure the directory exists.
  try {
    // overwrite directory if exists
    await mkdir(directory, { recursive: true });
  } catch (err) {
    if (fallback) {
      return handleCache(os.tmpdir(), params);
    }

    throw err;
  }

  // Otherwise just transform the file
  // return it to the user asap and write it in cache
  const result = await transform(source, options);
  result.externalDependencies = await handleExternalDepedencies(
    result.externalDependencies,
    getFileTimestamp,
  );

  try {
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
 *
 * @async
 * @param  {Object}   params
 * @param  {String}   params.cacheDirectory   Directory to store cached files
 * @param  {String}   params.cacheIdentifier  Unique identifier to bust cache
 * @param  {Boolean}  params.cacheCompression Whether compressing cached files
 * @param  {String}   params.source   Original contents of the file to be cached
 * @param  {Object}   params.options  Options to be given to the transform fn
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

module.exports = async function (params) {
  let directory;

  if (typeof params.cacheDirectory === "string") {
    directory = params.cacheDirectory;
  } else {
    if (defaultCacheDirectory === null) {
      const { default: findCacheDir } = await findCacheDirP;
      defaultCacheDirectory =
        findCacheDir({ name: "babel-loader" }) || os.tmpdir();
    }

    directory = defaultCacheDirectory;
  }

  return await handleCache(directory, params);
};
