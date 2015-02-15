var loaderUtils = require('loader-utils'),
    babel = require('babel-core'),
    toBoolean = function (val) {
        if (val === 'true') { return true; }
        if (val === 'false') { return false; }
        return val;
    };

module.exports = function (source) {

    var options = loaderUtils.parseQuery(this.query),
        result, code, map;

    if (this.cacheable) {
        this.cacheable();
    }

    // Convert 'true'/'false' to true/false
    options = Object.keys(options).reduce(function (accumulator, key) {
        accumulator[key] = toBoolean(options[key]);
        return accumulator;
    }, {});

    options.sourceMap = this.sourceMap;
    options.filename = loaderUtils.getRemainingRequest(this);

    result = babel.transform(source, options);
    code = result.code;

    map = result.map;
    if (map) {
        map.sourcesContent = [source];
    }

    this.callback(null, code, map);

};
