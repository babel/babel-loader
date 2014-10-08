var should = require('should');

describe('basic', function () {
    it('should compile a es6 module', function () {
        var App = require('../!./fixtures/basic.js').default,
            result = new App().result;

        result.should.be.type('string');
        result.should.equal('testtest');
    });
});
