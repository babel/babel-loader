import test from "ava";
import path from "path";
import resolveRc from "../lib/resolve-rc.js";
import fs from "fs";

test("should find the .babelrc file", t => {
  const start = path.join(__dirname, "fixtures/babelrc-test/1/2/3");
  const result = resolveRc(fs, start);

  t.true(typeof result === "string");
});
