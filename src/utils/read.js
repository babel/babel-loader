const path = require("path");

module.exports = function(fs, config) {
  if (path.basename(config) === "package.json") {
    const pkg = require(config);

    return JSON.stringify(pkg.babel);
  }

  // memoryFS (webpack) returns a {Buffer}
  return fs.readFileSync(config).toString("utf-8");
};
