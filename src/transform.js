const babel = require("@babel/core");
const LoaderError = require("./Error");

function env(prev) {
  if (prev === undefined) delete process.env.BABEL_ENV;
  else process.env.BABEL_ENV = prev;
}

module.exports = function(source, options, cb) {
  const forceEnv = options.forceEnv;

  delete options.forceEnv;

  let tmpEnv;

  if (forceEnv) {
    tmpEnv = process.env.BABEL_ENV;
    process.env.BABEL_ENV = forceEnv;
  }

  babel.transform(source, options, (err, result) => {
    if (forceEnv) env(tmpEnv);

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
