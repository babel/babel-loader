module.exports = function(fileSystem, filename) {
  if (!filename) return false;

  let exists = false;

  try {
    exists = fileSystem.statSync(filename).isFile();
  } catch (ignoreError) {
    return false;
  }

  return exists;
};
