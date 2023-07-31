import test from "ava";
import fs from "node:fs";
import path from "node:path";
import { rimraf } from "rimraf";
import PnpWebpackPlugin from "pnp-webpack-plugin";
import createTestDirectory from "./helpers/createTestDirectory.js";
import { webpackAsync } from "./helpers/webpackAsync.js";
import ReactIntlPlugin from "react-intl-webpack-plugin";
import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(path.dirname(import.meta.url));

const cacheDir = path.join(__dirname, "output/cache/cachefiles");
const outputDir = path.join(__dirname, "output/metadata");
const babelLoader = path.join(__dirname, "../lib");
const globalConfig = {
  mode: "development",
  entry: "./test/fixtures/metadata.js",
  output: {
    path: outputDir,
    filename: "[id].metadata.js",
  },
  plugins: [new ReactIntlPlugin()],
  resolve: {
    plugins: [PnpWebpackPlugin],
  },
  module: {
    rules: [
      {
        test: /\.jsx?/,
        loader: babelLoader,
        options: {
          metadataSubscribers: [ReactIntlPlugin.metadataContextFunctionName],
          plugins: ["react-intl"],
          presets: [],
        },
        exclude: /node_modules/,
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

test("should pass metadata code snippet", async t => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: t.context.directory,
      filename: "[id].metadata.js",
    },
  });

  const stats = await webpackAsync(config);
  t.deepEqual(stats.compilation.errors, []);
  t.deepEqual(stats.compilation.warnings, []);

  const files = fs.readdirSync(t.context.directory);
  t.true(files.length > 0);

  const text = fs.readFileSync(
    path.resolve(t.context.directory, "reactIntlMessages.json"),
    "utf8",
  );
  const jsonText = JSON.parse(text);
  t.true(jsonText.length == 1);
  t.true(jsonText[0].id == "greetingId");
  t.true(jsonText[0].defaultMessage == "Hello World!");
});

test("should not throw error", async t => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: t.context.directory,
      filename: "[id].metadata.js",
    },
  });

  const stats = await webpackAsync(config);
  t.deepEqual(stats.compilation.errors, []);
  t.deepEqual(stats.compilation.warnings, []);
});

test("should throw error", async t => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: t.context.directory,
      filename: "[id].metadata.js",
    },
    entry: "./test/fixtures/metadataErr.js",
  });

  const stats = await webpackAsync(config);
  t.true(stats.compilation.errors.length > 0);
  t.deepEqual(stats.compilation.warnings, []);
});

test("should pass metadata code snippet ( cache version )", async t => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: t.context.directory,
      filename: "[id].metadata.js",
    },
    module: {
      rules: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          options: {
            metadataSubscribers: [ReactIntlPlugin.metadataContextFunctionName],
            plugins: ["react-intl"],
            cacheDirectory: cacheDir,
            presets: [],
          },
          exclude: /node_modules/,
        },
      ],
    },
  });

  const stats = await webpackAsync(config);
  t.deepEqual(stats.compilation.errors, []);
  t.deepEqual(stats.compilation.warnings, []);

  const files = fs.readdirSync(t.context.directory);
  t.true(files.length > 0);

  const text = fs.readFileSync(
    path.resolve(t.context.directory, "reactIntlMessages.json"),
    "utf8",
  );
  const jsonText = JSON.parse(text);
  t.true(jsonText.length == 1);
  t.true(jsonText[0].id == "greetingId");
  t.true(jsonText[0].defaultMessage == "Hello World!");
});
