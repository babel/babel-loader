const path = require("path");

module.exports = function relative(sourceRoot, filename) {
  const rootPath = sourceRoot.split(path.sep)[1];
  // If the file is in a completely different root folder use the absolute path of file.
  if (rootPath && rootPath !== filename.split(path.sep)[1]) {
    return filename;
  }

  return path.relative(sourceRoot, filename);
};
