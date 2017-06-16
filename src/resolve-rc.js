/**
 * The purpose of this module, is to find the project's .babelrc and
 * use its contents to bust the babel-loader's internal cache whenever an option
 * changes.
 *
 * @see https://github.com/babel/babel-loader/issues/62
 * @see http://git.io/vLEvu
 */
const path = require("path");
const exists = require("./utils/exists");

const findBabelrcPath = function find(fileSystem, start, rel) {
  const file = path.join(start, rel);

  if (exists(fileSystem, file)) {
    return file;
  }

  const up = path.dirname(start);
  if (up !== start) {
    // Reached root
    return find(fileSystem, up, rel);
  }
};

module.exports = function(fileSystem, loc, rel) {
  rel = rel || ".babelrc";

  return findBabelrcPath(fileSystem, loc, rel);
};
