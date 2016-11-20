const path = require("path");

/**
* Make a path relative to a URL or another path.
* Borrowed from https://github.com/mozilla/source-map/blob/master/lib/util.js
*
* @param aRoot The root path or URL.
* @param aPath The path or URL to be made relative to aRoot.
*/
module.exports = function relative(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }
  if (/^(?:[a-zA-Z]\:|\\\\[\w\.]+\\[\w.$]+)/.test(aRoot) && path.win32) {
    // let Node take care of Windows paths
    // modified from regex by agent-j
    // (http://stackoverflow.com/questions/6416065/c-sharp-regex-for-file-paths-e-g-c-test-test-exe)
    return path.win32.relative(aRoot, aPath);
  }

  aRoot = aRoot.replace(/\/$/, "");

  // It is possible for the path to be above the root. In this case, simply
  // checking whether the root is a prefix of the path won't work. Instead, we
  // need to remove components from the root one by one, until either we find
  // a prefix that fits, or we run out of components to remove.
  let level = 0;
  while (aPath.indexOf(aRoot + "/") !== 0) {
    const index = aRoot.lastIndexOf("/");
    if (index < 0) {
      return aPath;
    }

    // If the only part of the root that is left is the scheme (i.e. http://,
    // file:///, etc.), one or more slashes (/), or simply nothing at all, we
    // have exhausted all components, so the path is not relative to the root.
    aRoot = aRoot.slice(0, index);
    if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
      return aPath;
    }

    ++level;
  }

  // Make sure we add a '../' for each component we removed from the root.
  return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
};
