import test from "ava";
import fs from "fs";
import path from "path";
import read from "../../lib/utils/read.js";

const files = {
  existent: path.join(__dirname, "../fixtures/basic.js"),
  pkg: path.join(__dirname, "../fixtures/package-test/package.json"),
};

const content = fs.readFileSync(files.existent, "utf8");

test("should return contents if file exists", t => {
  const realFile = read(fs, files.existent);
  t.is(realFile, content);
});

test("should only return config from package.json", t => {
  const realFile = read(fs, files.pkg);
  t.is(realFile, '{"stage":3}');
});
