'use strict';

module.exports = function transpileTask() {
  var babel = require('babel-core');
  return function transpile(source, options) {
    var result = babel.transform(source, options);
    var code = result.code;
    var map = result.map;

    if (map && (!map.sourcesContent || !map.sourcesContent.length)) {
      map.sourcesContent = [source];
    }

    return {
      code: code,
      map: map,
    };
  };
};
