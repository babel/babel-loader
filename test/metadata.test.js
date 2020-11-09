import test from "ava";
import fs from "fs";
import path from "path";
import rimraf from "rimraf";
import webpack from "webpack";
import PnpWebpackPlugin from "pnp-webpack-plugin";
import createTestDirectory from "./helpers/createTestDirectory";

const ReactIntlPlugin = require("react-intl-webpack-plugin");

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
test.beforeEach.cb(t => {
  createTestDirectory(outputDir, t.title, (err, directory) => {
    if (err) return t.end(err);
    t.context.directory = directory;
    t.end();
  });
});

test.afterEach.cb(t => rimraf(t.context.directory, t.end));

test.cb("should pass metadata code snippet", t => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: t.context.directory,
      filename: "[id].metadata.js",
    },
  });

  webpack(config, (err, stats) => {
    t.is(err, null);
    t.deepEqual(stats.compilation.errors, []);
    t.deepEqual(stats.compilation.warnings, []);

    fs.readdir(t.context.directory, (err, files) => {
      t.is(err, null);
      t.true(files.length > 0);
      fs.readFile(
        path.resolve(t.context.directory, "reactIntlMessages.json"),
        function (err, data) {
          t.is(err, null);
          const text = data.toString();
          const jsonText = JSON.parse(text);
          t.true(jsonText.length == 1);
          t.true(jsonText[0].id == "greetingId");
          t.true(jsonText[0].defaultMessage == "Hello World!");
          t.end();
        },
      );
    });
  });
});

test.cb("should not throw error", t => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: t.context.directory,
      filename: "[id].metadata.js",
    },
  });

  webpack(config, (err, stats) => {
    t.is(err, null);
    t.deepEqual(stats.compilation.errors, []);
    t.deepEqual(stats.compilation.warnings, []);
    t.end();
  });
});

test.cb("should throw error", t => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: t.context.directory,
      filename: "[id].metadata.js",
    },
    entry: "./test/fixtures/metadataErr.js",
  });

  webpack(config, (err, stats) => {
    t.is(err, null);
    t.true(stats.compilation.errors.length > 0);
    t.deepEqual(stats.compilation.warnings, []);
    t.end();
  });
});

test.cb("should pass metadata code snippet ( cache version )", t => {
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

  webpack(config, (err, stats) => {
    t.is(err, null);
    t.deepEqual(stats.compilation.errors, []);
    t.deepEqual(stats.compilation.warnings, []);

    fs.readdir(t.context.directory, (err, files) => {
      t.is(err, null);
      t.true(files.length > 0);
      fs.readFile(
        path.resolve(t.context.directory, "reactIntlMessages.json"),
        function (err, data) {
          t.is(err, null);
          const text = data.toString();
          const jsonText = JSON.parse(text);
          t.true(jsonText.length == 1);
          t.true(jsonText[0].id == "greetingId");
          t.true(jsonText[0].defaultMessage == "Hello World!");
          t.end();
        },
      );
    });
  });
});
