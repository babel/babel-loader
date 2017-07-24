module.exports = function exists (fileSystem, filename) {
  try {
    return fileSystem.statSync(filename).isFile()
  }
  catch (err) {
    if (err.code === 'ENOENT') return false
    throw err
  }
}
