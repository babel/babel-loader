const babel = require("@babel/core");
const LoaderError = require("./Error");

module.exports = function(source, options, cb) {
  babel.transform(source, options, (err, result) => {
    if (err) {
      return err.message && err.codeFrame ? cb(new LoaderError(err)) : cb(err);
    }

    const { code, map, metadata } = result;

    if (map && (!map.sourcesContent || !map.sourcesContent.length)) {
      map.sourcesContent = [source];
    }

    return cb(null, { code, map, metadata });
  });
};

module.exports.version = babel.version;
