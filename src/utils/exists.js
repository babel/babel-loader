module.exports = function(fileSystem, filename) {
  let exists = false;

  try {
    exists = fileSystem.statSync(filename).isFile();
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  return exists;
};
