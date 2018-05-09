const babel = require("@babel/core");
const promisify = require("util.promisify");
const LoaderError = require("./Error");

const transform = promisify(babel.transform);

module.exports = async function(source, options) {
  let result;
  try {
    result = await transform(source, options);
  } catch (err) {
    throw err.message && err.codeFrame ? new LoaderError(err) : err;
  }

  if (!result) return null;

  const { code, map, metadata } = result;

  if (map && (!map.sourcesContent || !map.sourcesContent.length)) {
    map.sourcesContent = [source];
  }

  return { code, map, metadata };
};

module.exports.version = babel.version;
