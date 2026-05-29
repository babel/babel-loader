// @ts-check
var objToString = Object.prototype.toString;
var objKeys = Object.getOwnPropertyNames;

/**
 * A custom Babel options serializer
 *
 * Intentional deviation from JSON.stringify:
 * 1. Object properties are sorted before serializing
 * 2. The output is NOT a valid JSON: e.g.
 *    The output does not enquote strings, which means a JSON-like string '{"a":1}'
 *    will share the same result with an JS object { a: 1 }. This is not an issue
 *    for Babel options, but it can not be used for general serialization purpose
 * 3. Only 20% slower than the native JSON.stringify on V8
 *
 * This function is a fork from https://github.com/nickyout/fast-stable-stringify
 * @param {unknown} val Babel options
 * @param {boolean} isArrayProp
 * @returns serialized Babel options
 */
function serialize(val, isArrayProp) {
  var i, max, str, keys, key, propVal, toStr;
  if (val === true) {
    return "!0";
  }
  if (val === false) {
    return "!1";
  }
  switch (typeof val) {
    case "object":
      if (val === null) {
        return null;
        // @ts-expect-error
      } else if (val.toJSON && typeof val.toJSON === "function") {
        // @ts-expect-error toJSON has been checked above
        return serialize(val.toJSON(), isArrayProp);
      } else {
        toStr = objToString.call(val);
        if (toStr === "[object Array]") {
          str = "[";
          // @ts-expect-error val is an array
          max = val.length - 1;
          for (i = 0; i < max; i++) {
            // @ts-expect-error val is an array
            str += serialize(val[i], true) + ",";
          }
          if (max > -1) {
            // @ts-expect-error val is an array
            str += serialize(val[i], true);
          }
          return str + "]";
        } else if (toStr === "[object Object]") {
          // only object is left
          keys = objKeys(val).sort();
          max = keys.length;
          str = "{";
          i = 0;
          while (i < max) {
            key = keys[i];
            // @ts-expect-error key must index val
            propVal = serialize(val[key], false);
            if (propVal !== undefined) {
              if (str) {
                str += ",";
              }
              str += '"' + key + '":' + propVal;
            }
            i++;
          }
          return str + "}";
        } else {
          return JSON.stringify(val);
        }
      }
    case "function":
    case "undefined":
      return isArrayProp ? null : undefined;
    case "string":
      return val;
    default:
      // @ts-expect-error val must be a number because of the toJSON check above
      return isFinite(val) ? val : null;
  }
}

/**
 * @param {unknown} val
 * @returns {string | undefined}
 */
module.exports = function (val) {
  var returnVal = serialize(val, false);
  if (returnVal !== undefined) {
    return "" + returnVal;
  }
};
