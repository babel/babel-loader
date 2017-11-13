const path = require("path");

module.exports = function relative(root, file) {
  const rootPath = root.replace(/\\/g, "/").split("/")[1];
  const filePath = file.replace(/\\/g, "/").split("/")[1];

  // If the file is in a completely different root folder
  // use the absolute path of the file
  if (rootPath && rootPath !== filePath) {
    return file;
  }

  return path.relative(root, file);
};
