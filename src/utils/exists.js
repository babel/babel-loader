/**
 * Check if file exists and cache the result
 * return the result in cache
 *
 * @example
 * var exists = require('./helpers/fsExists');
 * exists(require('fs'), '.babelrc'); // false
 */
module.exports = function(fileSystem, filename) {
  if (!filename) return false;

  let exists = false;

  try {
    exists = fileSystem.statSync(filename).isFile();
  } catch (ignoreError) {
    return false;
  }

  return exists;
};
