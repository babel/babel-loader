module.exports = function(fileSystem, filename) {
  if (!filename) {
    throw new Error("filename must be a string");
  }

  // Webpack `fs` return Buffer
  return fileSystem.readFileSync(filename).toString("utf8");
};
