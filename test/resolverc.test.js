'use strict';

const fs = require('fs');
const path = require('path');
const expect = require('expect.js');
const resolveRc = require('../lib/resolve-rc.js');
const exists = require('../lib/helpers/exists.js');
const read = require('../lib/helpers/read.js');

describe('ResolveRc', function() {

  it('should find the .babelrc file', function() {
    const start = path.resolve(__dirname, 'fixtures/babelrc-test/1/2/3');
    const result = resolveRc(start);

    expect(result).to.be.a('string');
  });
});

describe('exists', function() {

  const cache = {};
  const files = {
    existent: path.resolve(__dirname, 'fixtures/basic.js'),
    fake: path.resolve(__dirname, 'fixtures/nonExistentFile.js'),
  };

  it('should return boolean if file exists', function() {
    const realFile = exists(cache)(files.existent);
    const fakeFile = exists(cache)(files.fake);

    expect(realFile).to.equal(true);
    expect(fakeFile).to.equal(false);
  });

  it('should keep cache of if previous results', function() {
    expect(cache[files.existent]).to.equal(true);
    expect(cache[files.fake]).to.equal(false);
  });

});

describe('read', function() {

  const cache = {};
  const files = {
    existent: path.resolve(__dirname, 'fixtures/basic.js'),
    fake: path.resolve(__dirname, 'fixtures/nonExistentFile.js'),
  };

  const content = fs.readFileSync(files.existent, 'utf8');

  it('should return contents if file exists', function() {
    const realFile = read(cache)(files.existent);
    expect(realFile).to.equal(content);
  });

  it('should keep cache of if previous results', function() {
    expect(cache[files.existent]).to.equal(content);
  });


});
