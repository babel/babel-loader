var loaderUtils = require('loader-utils'),
    to5 = require('6to5');

module.exports = function (source) {

    var options = loaderUtils.parseQuery(this.query),
        result, code, map;

    if (this.cacheable) {
        this.cacheable();
    }

    options.sourceMap = true;
    options.filename = loaderUtils.getRemainingRequest(this);
    result = to5.transform(source, options);

    code = result.code;
    map = result.map;
    map.sourcesContent = [source];

    this.callback(null, code, map);
};
