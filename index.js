var loaderUtils = require('loader-utils'),
    to5 = require('6to5');

module.exports = function (source) {
    var options = loaderUtils.parseQuery(this.query),
        result;

    if (this.cacheable) {
        this.cacheable();
    }

    result = to5.transform(source, options);

    this.callback(null, result.code);

};
