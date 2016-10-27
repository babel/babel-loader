"use strict";

let fs = require("fs");
let path = require("path");
let resolveRc = require("../lib/resolve-rc.js");
let exists = require("../lib/helpers/exists.js");
let read = require("../lib/helpers/read.js");

describe("ResolveRc", function() {

  it("should find the .babelrc file", function() {
    let start = path.resolve(__dirname, "fixtures/babelrc-test/1/2/3");
    let result = resolveRc(start);

    expect(typeof result).toBe("string");
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

    expect(realFile).toBe(true);
    expect(fakeFile).toBe(false);
  });

  it("should keep cache of if previous results", function() {
    expect(cache[files.existent]).toBe(true);
    expect(cache[files.fake]).toBe(false);
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
    expect(realFile).toBe(content);
  });

  it("should keep cache of if previous results", function() {
    expect(cache[files.existent]).toBe(content);
  });
});
