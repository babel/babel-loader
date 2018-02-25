module.exports = function(fs, config) {
  let exists = false;

  try {
    exists = fs.statSync(config).isFile();
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  return exists;
};
