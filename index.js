var loaderUtils = require('loader-utils'),
    to5 = require('6to5');

module.exports = function (source, map) {
    var options = loaderUtils.parseQuery(this.query),
        result, code, map;

    if (this.cacheable) {
        this.cacheable();
    }

    result = to5.transform(source, options);

    code = result.code;

    if (result.map) {
        map = result.map;
    }

    this.callback(null, code, map);
};
