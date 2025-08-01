// @ts-check
const babel = require("@babel/core");
const { promisify } = require("util");
const LoaderError = require("./Error");

const babelTransform = babel.transformAsync ?? promisify(babel.transform);
/**
 * @typedef {Object} AmendedTransformResult
 * @property {[string, number?][]} externalDependencies
 */
/**
 * @typedef {Omit<import("@babel/core").FileResult, "externalDependencies" | "options"> & AmendedTransformResult} TransformResult
 */
/**
 * Transform the source code using Babel.
 * @async
 * @param {string} source The source code to transform.
 * @param {import("@babel/core").InputOptions} options The Babel options.
 * @returns {Promise<null | TransformResult>} The transformed result or null if no transformation is needed.
 */
module.exports = async function transform(source, options) {
  /**
   * @type {import("@babel/core").FileResult}
   */
  let result;
  try {
    result = await babelTransform(source, options);
  } catch (err) {
    throw err.message && err.codeFrame ? new LoaderError(err) : err;
  }

  if (!result) return null;

  // We don't return the full result here because some entries are not
  // really serializable. For a full list of properties see here:
  // https://github.com/babel/babel/blob/main/packages/babel-core/src/transformation/index.ts
  // For discussion on this topic see here:
  // https://github.com/babel/babel-loader/pull/629
  const { ast, code, map, metadata, sourceType, externalDependencies } = result;

  if (map && (!map.sourcesContent || !map.sourcesContent.length)) {
    map.sourcesContent = [source];
  }

  return {
    ast,
    code,
    map,
    metadata,
    sourceType,
    // Convert it from a Set to an Array to make it JSON-serializable.
    externalDependencies: Array.from(
      externalDependencies || [],
      /**
       * @param {string} dep
       * @returns {[string, number?]}
       */
      dep => [dep],
    ).sort(),
  };
};

module.exports.version = babel.version;
