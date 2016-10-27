"use strict";

let fs = require("fs");
let path = require("path");
let expect = require("expect.js");
let resolveRc = require("../lib/resolve-rc.js");
let exists = require("../lib/helpers/exists.js");
let read = require("../lib/helpers/read.js");

describe("ResolveRc", function() {

  it("should find the .babelrc file", function() {
    let start = path.resolve(__dirname, "fixtures/babelrc-test/1/2/3");
    let result = resolveRc(start);

    expect(result).to.be.a("string");
  });
});

describe("exists", function() {

  let cache = {};
  let files  = {
    existent: path.resolve(__dirname, "fixtures/basic.js"),
    fake: path.resolve(__dirname, "fixtures/nonExistentFile.js"),
  };

  it("should return boolean if file exists", function() {
    let realFile = exists(cache)(files.existent);
    let fakeFile = exists(cache)(files.fake);

    expect(realFile).to.equal(true);
    expect(fakeFile).to.equal(false);
  });

  it("should keep cache of if previous results", function() {
    expect(cache[files.existent]).to.equal(true);
    expect(cache[files.fake]).to.equal(false);
  });

});

describe("read", function() {

  let cache = {};
  let files  = {
    existent: path.resolve(__dirname, "fixtures/basic.js"),
    fake: path.resolve(__dirname, "fixtures/nonExistentFile.js"),
  };

  let content = fs.readFileSync(files.existent, "utf8");

  it("should return contents if file exists", function() {
    let realFile = read(cache)(files.existent);
    expect(realFile).to.equal(content);
  });

  it("should keep cache of if previous results", function() {
    expect(cache[files.existent]).to.equal(content);
  });


});
