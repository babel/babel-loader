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

const find = function find(start, rel) {
  const file = path.join(start, rel);

  if (exists(file)) {
    return read(file);
  }

  const up = path.dirname(start);
  if (up !== start) {
    // Reached root
    return find(up, rel);
  }
};

module.exports = function(loc, rel) {
  rel = rel || ".babelrc";
  const cacheKey = `${loc}/${rel}`;
  if (!(cacheKey in cache)) {
    cache[cacheKey] = find(loc, rel);
  }
  return cache[cacheKey];
};
