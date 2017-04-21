import test from "ava";
import fs from "fs";
import path from "path";
import rimraf from "rimraf";
import webpack from "webpack";
import createTestDirectory from "./helpers/createTestDirectory";

const outputDir = path.join(__dirname, "output/options");
const babelLoader = path.join(__dirname, "../lib");
const globalConfig = {
  entry: path.join(__dirname, "fixtures/basic.js"),
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

test.cb("should interpret options given to the loader", t => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader + "?presets[]=env",
          exclude: /node_modules/,
        },
      ],
    },
  });

  webpack(config, err => {
    t.is(err, null);

    fs.readdir(outputDir, (err, files) => {
      t.is(err, null);
      t.true(files.length > 0);

      t.end();
    });
  });
});
