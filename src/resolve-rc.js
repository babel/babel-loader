/**
 * The purpose of this module, is to find the project's .babelrc and
 * use its contents to bust the babel-loader's internal cache whenever an option
 * changes.
 *
 * @see https://github.com/babel/babel-loader/issues/62
 * @see http://git.io/vLEvu
 */
let path = require("path");
let exists = require("./utils/exists")({});
let read = require("./utils/read")({});

let find = function find(start, rel) {
  let file = path.join(start, rel);

  if (exists(file)) {
    return read(file);
  }

  let up = path.dirname(start);
  if (up !== start) {
    // Reached root
    return find(up, rel);
  }

};

module.exports = function(loc, rel) {
  rel = rel || ".babelrc";

  return find(loc, rel);
};
