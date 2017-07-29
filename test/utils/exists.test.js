import test from "ava";
import path from "path";
import exists from "../../lib/utils/exists.js";
import fs from "fs";

const files = {
  existent: path.join(__dirname, "../fixtures/basic.js"),
  fake: path.join(__dirname, "../fixtures/nonExistentFile.js"),
};

test("should return boolean if file exists", t => {
  const realFile = exists(fs, files.existent);
  const fakeFile = exists(fs, files.fake);

  t.true(realFile);
  t.false(fakeFile);
});

test("should rethrow errors besides ENOENT", t => {
  t.throws(() => exists(fs, false), /path must be a string/);
  t.throws(() => exists(fs, undefined), /path must be a string/);
});
