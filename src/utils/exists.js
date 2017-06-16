module.exports = function(fileSystem, filename) {
  let exists = false;

  try {
    exists = fileSystem.statSync(filename).isFile();
  } catch (e) {}

  return exists;
};
