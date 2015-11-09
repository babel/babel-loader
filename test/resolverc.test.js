'use strict';

var fs = require('fs');
var path = require('path');
var expect = require('expect.js');
var resolveRc = require('../lib/resolve-rc.js');
var exists = require('../lib/helpers/exists.js');
var read = require('../lib/helpers/read.js');

describe('ResolveRc', function() {

  it('should find the .babelrc file', function() {
    var start = path.resolve(__dirname, 'fixtures/babelrc-test/1/2/3');
    var result = resolveRc(start);

    expect(result).to.be.a('string');
  });
});

describe('exists', function() {

  var cache = {};
  var files  = {
    existent: path.resolve(__dirname, 'fixtures/basic.js'),
    fake: path.resolve(__dirname, 'fixtures/nonExistentFile.js'),
  };

  it('should return boolean if file exists', function() {
    var realFile = exists(cache)(files.existent);
    var fakeFile = exists(cache)(files.fake);

    expect(realFile).to.equal(true);
    expect(fakeFile).to.equal(false);
  });

  it('should keep cache of if previous results', function() {
    expect(cache[files.existent]).to.equal(true);
    expect(cache[files.fake]).to.equal(false);
  });

});

describe('read', function() {

  var cache = {};
  var files  = {
    existent: path.resolve(__dirname, 'fixtures/basic.js'),
    fake: path.resolve(__dirname, 'fixtures/nonExistentFile.js'),
  };

  var content = fs.readFileSync(files.existent, 'utf8');

  it('should return contents if file exists', function() {
    var realFile = read(cache)(files.existent);
    expect(realFile).to.equal(content);
  });

  it('should keep cache of if previous results', function() {
    expect(cache[files.existent]).to.equal(content);
  });


});
