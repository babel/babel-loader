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
const crypto = require("crypto");
const findCacheDir = require("find-cache-dir");
const { open } = require("lmdb");

const transform = require("./transform");
// Lazily instantiated when needed
let defaultCacheDirectory = null;
let cacheDB = null;

/**
 * Initialize cache
 */

async function initCacheDB(cacheDir, cacheCompression) {
  if (cacheDB) return cacheDB;
  const fallback = cacheDir !== os.tmpdir();

  try {
    cacheDB = open({
      path: cacheDir,
      compression: cacheCompression,
      sharedStructuresKey: Symbol.for(`structures`),
    });
  } catch (err) {
    if (fallback) {
      cacheDB = initCacheDB(os.tmpdir(), cacheCompression);
    }

    throw err;
  }
}

/**
 * Build the cache key for the cached file
 *
 * @params {String} source  File source code
 * @params {Object} options Options used
 *
 * @return {String}
 */
const fileCacheKey = function (source, identifier, options) {
  // md4 hashing is not supported starting with node v17.0.0
  const majorNodeVersion = parseInt(process.versions.node.split(".")[0], 10);
  let hashType = "md4";
  if (majorNodeVersion >= 17) {
    hashType = "md5";
  }

  const hash = crypto.createHash(hashType);

  const contents = JSON.stringify({ source, options, identifier });

  hash.update(contents);

  return hash.digest("hex");
};

/**
 * Handle the cache
 *
 * @params {String} directory
 * @params {Object} params
 */
const handleCache = async function (params) {
  const { source, options = {}, cacheIdentifier } = params;

  const cacheKey = fileCacheKey(source, cacheIdentifier, options);

  // Fetch cached result if it exists
  const cached = await cacheDB.get(cacheKey);
  if (typeof cached !== "undefined") {
    return cached;
  }

  // Otherwise, just transform the cacheKey
  // return it to the user asap and write it in cache
  const result = await transform(source, options);
  cacheDB.put(cacheKey, result);

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
      defaultCacheDirectory =
        findCacheDir({ name: "babel-loader" }) || os.tmpdir();
    }

    directory = defaultCacheDirectory;
  }

  await initCacheDB(directory, params.cacheCompression);

  return await handleCache(params);
};
