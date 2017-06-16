import test from "ava";
import path from "path";
import resolveRc from "../lib/resolve-rc";
import fs from "fs";

test("should find the .babelrc file", t => {
  const start = path.join(__dirname, "fixtures/babelrc-test/1/2/3");
  const result = resolveRc(fs, start);

  t.is(result, path.join(__dirname, "fixtures/babelrc-test/.babelrc"));
});

test("should find the .babelrc.js config", t => {
  const start = path.join(__dirname, "fixtures/babelrc-test/1/2/5/4");
  const result = resolveRc(fs, start);

  t.is(result, path.join(__dirname, "fixtures/babelrc-test/1/2/5/.babelrc.js"));
});

test("should find the package.json babel config", t => {
  const start = path.join(__dirname, "fixtures/package-test");
  const result = resolveRc(fs, start);

  t.is(result, path.join(__dirname, "fixtures/package-test/package.json"));
});
