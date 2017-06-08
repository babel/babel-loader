/**
 * Read the file and cache the result
 * return the result in cache
 *
 * @example
 * var read = require('./helpers/fsExists');
 * read(require('fs'), '.babelrc'); // file contents...
 */
module.exports = function(fileSystem, filename) {
  if (!filename) {
    throw new Error("filename must be a string");
  }

  // Webpack `fs` return Buffer
  return fileSystem.readFileSync(filename).toString("utf8");
};
