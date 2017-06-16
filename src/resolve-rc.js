const path = require("path");
const exists = require("./utils/exists");

module.exports = function find(fileSystem, start) {
  for (const fileName of [".babelrc", ".babelrc.js", "package.json"]) {
    const file = path.join(start, fileName);

    if (exists(fileSystem, file)) {
      if (
        fileName !== "package.json" ||
        typeof require(file).babel === "object"
      ) {
        return file;
      }
    }
  }

  const up = path.dirname(start);

  // Reached root
  if (up !== start) {
    return find(fileSystem, up);
  }
};
