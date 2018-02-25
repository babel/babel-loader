const path = require("path");
const exists = require("./utils/exists");

const configs = [".babelrc", ".babelrc.js", "package.json"];

module.exports = function find(fs, start) {
  for (let config of configs) {
    config = path.join(start, config);

    if (exists(fs, config)) {
      if (
        path.basename(config) !== "package.json" ||
        typeof require(config).babel === "object"
      ) {
        return config;
      }
    }
  }

  const up = path.dirname(start);

  // Reached root
  if (up !== start) {
    return find(fs, up);
  }
};
