import test from "ava";
import path from "path";
import exists from "../../lib/utils/exists.js";

const cache = {};
const files  = {
  existent: path.join(__dirname, "../fixtures/basic.js"),
  fake: path.join(__dirname, "../fixtures/nonExistentFile.js"),
};

test("should return boolean if file exists", (t) => {
  const realFile = exists(cache)(files.existent);
  const fakeFile = exists(cache)(files.fake);

  t.true(realFile);
  t.false(fakeFile);

  t.true(cache[files.existent]);
  t.false(cache[files.fake]);
});
