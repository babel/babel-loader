/**
 * The purpose of this module, is to find the project's .babelrc and
 * use its contents to bust the babel-loader's internal cache whenever an option
 * changes.
 *
 * @see https://github.com/babel/babel-loader/issues/62
 * @see http://git.io/vLEvu
 */
const path = require("path");
const exists = require("./utils/exists")({});
const read = require("./utils/read")({});

const cache = {};

const find = function find(start) {
  const babelRcFile = path.join(start, ".babelrc");

  if (exists(babelRcFile)) {
    return read(babelRcFile);
  }

  const packageJsonFile = path.join(start, "package.json");

  if (exists(packageJsonFile)) {
    const parsedPackageJson = require(packageJsonFile);

    if (parsedPackageJson.babel) {
      return JSON.stringify(parsedPackageJson.babel);
    }
  }

  const up = path.dirname(start);
  if (up !== start) {
    // Reached root
    return find(up);
  }
};

module.exports = function(loc) {
  const cacheKey = `${loc}`;
  if (!(cacheKey in cache)) {
    cache[cacheKey] = find(loc);
  }
  return cache[cacheKey];
};
