import test from "ava";
import fs from "fs";
import path from "path";
import rimraf from "rimraf";
import semver from "semver";
import webpack2 from "webpack";
import { version } from "webpack/package.json";
import createTestDirectory from "../helpers/createTestDirectory";

const outputDir = path.join(__dirname, "../output/webpack2");
const babelLoader = path.join(__dirname, "../../lib");
const globalConfig = {
  entry: path.join(__dirname, "../fixtures/basic.js"),
  module: {
    loaders: [
      {
        test: /\.jsx?/,
        loader: babelLoader,
        exclude: /node_modules/,
      },
    ],
  },
};

// Create a separate directory for each test so that the tests
// can run in parallel
test.cb.beforeEach(t => {
  createTestDirectory(outputDir, t.title, (err, directory) => {
    if (err) return t.end(err);
    t.context.directory = directory;
    t.end();
  });
});

test.cb.afterEach(t => rimraf(t.context.directory, t.end));

test.cb("is using webpack 2", t => {
  t.is(semver.satisfies(version, "^2.0.0"), true);
  t.end();
});

test.cb("should work with webpack 2", t => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader + "?presets[]=@babel/env",
          exclude: /node_modules/,
        },
      ],
    },
  });

  webpack2(config, (err, stats) => {
    t.is(err, null);
    t.is(stats.compilation.errors.length, 0);
    t.is(stats.compilation.warnings.length, 0);

    fs.readdir(outputDir, (err, files) => {
      t.is(err, null);
      t.true(files.length > 0);

      t.end();
    });
  });
});
