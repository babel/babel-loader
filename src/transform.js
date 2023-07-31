import { transformAsync } from "@babel/core";
import LoaderError from "./Error.js";

export default async function (source, options) {
  let result;
  try {
    result = await transformAsync(source, options);
  } catch (err) {
    throw err.message && err.codeFrame ? new LoaderError(err) : err;
  }

  if (!result) return null;

  // We don't return the full result here because some entries are not
  // really serializable. For a full list of properties see here:
  // https://github.com/babel/babel/blob/main/packages/babel-core/src/transformation/index.js
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
    externalDependencies: Array.from(externalDependencies || []),
  };
}

export { version } from "@babel/core";
