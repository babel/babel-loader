const fs = require("fs");
/**
 * Check if file exists and cache the result
 * return the result in cache
 *
 * @example
 * var exists = require('./helpers/fsExists')({});
 * exists('.babelrc'); // false
 */
module.exports = function(cache) {
  cache = cache || {};

  return function(filename) {

    if (!filename) { return false; }

    cache[filename] = cache[filename] || (fs.existsSync(filename) && fs.statSync(filename).isFile());

    return cache[filename];
  };
};
