import test from "ava";
import fs from "fs";
import path from "path";
import read from "../../lib/utils/read.js";

const cache = {};
const files  = {
  existent: path.join(__dirname, "../fixtures/basic.js"),
};

const content = fs.readFileSync(files.existent, "utf8");

test("should return contents if file exists", (t) => {
  const realFile = read(cache)(files.existent);
  t.is(realFile, content);
  t.is(cache[files.existent], content);
});
