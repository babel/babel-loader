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
