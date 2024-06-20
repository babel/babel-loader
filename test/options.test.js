import test from "ava";
import fs from "fs";
import path from "path";
import { rimraf } from "rimraf";
import { webpackAsync } from "./helpers/webpackAsync.js";
import createTestDirectory from "./helpers/createTestDirectory.js";

const outputDir = path.join(__dirname, "output/options");
const babelLoader = path.join(__dirname, "../lib");
const globalConfig = {
  mode: "development",
  entry: path.join(__dirname, "fixtures/basic.js"),
  module: {
    rules: [
      {
        test: /\.jsx?/,
        loader: babelLoader,
        exclude: /node_modules/,
        options: {
          presets: ["@babel/env"],
        },
      },
    ],
  },
};

// Create a separate directory for each test so that the tests
// can run in parallel
test.beforeEach(async t => {
  const directory = await createTestDirectory(outputDir, t.title);
  t.context.directory = directory;
});

test.afterEach(t => rimraf(t.context.directory));

test("should interpret options given to the loader", async t => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
    module: {
      rules: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          exclude: /node_modules/,
          options: {
            presets: ["@babel/env"],
          },
        },
      ],
    },
  });
  const stats = await webpackAsync(config);
  t.deepEqual(stats.compilation.errors, []);
  t.deepEqual(stats.compilation.warnings, []);

  const files = fs.readdirSync(outputDir);
  t.true(files.length > 0);
});
