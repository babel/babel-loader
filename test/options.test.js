import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { webpackAsync } from "./helpers/webpackAsync.js";
import createTestDirectory from "./helpers/createTestDirectory.js";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
const context = { directory: undefined };
test.beforeEach(async t => {
  const directory = await createTestDirectory(outputDir, t.name);
  context.directory = directory;
});

test.afterEach(() =>
  fs.rmSync(context.directory, { recursive: true, force: true }),
);

test("should interpret options given to the loader", async () => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: context.directory,
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
  assert.deepEqual(stats.compilation.errors, []);
  assert.deepEqual(stats.compilation.warnings, []);

  const files = fs.readdirSync(outputDir);
  assert.ok(files.length > 0);
});
