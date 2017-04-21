import test from "ava";
import fs from "fs";
import path from "path";
import assign from "object-assign";
import rimraf from "rimraf";
import webpack from "webpack";
import createTestDirectory from "./helpers/createTestDirectory";

const ReactIntlPlugin = require("react-intl-webpack-plugin");

const cacheDir = path.join(__dirname, "output/cache/cachefiles");
const outputDir = path.join(__dirname, "output/metadata");
const babelLoader = path.join(__dirname, "../lib");
const globalConfig = {
  entry: "./test/fixtures/metadata.js",
  output: {
    path: outputDir,
    filename: "[id].metadata.js",
  },
  plugins: [new ReactIntlPlugin()],
  module: {
    loaders: [
      {
        test: /\.jsx?/,
        loader: babelLoader,
        query: {
          metadataSubscribers: [ReactIntlPlugin.metadataContextFunctionName],
          plugins: [["react-intl", { enforceDescriptions: false }]],
          presets: [],
        },
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

test.cb("should pass metadata code snippet", t => {
  const config = assign({}, globalConfig, {
    output: {
      path: t.context.directory,
      filename: "[id].metadata.js",
    },
  });

  webpack(config, err => {
    t.is(err, null);

    fs.readdir(t.context.directory, (err, files) => {
      t.is(err, null);
      t.true(files.length > 0);
      fs.readFile(
        path.resolve(t.context.directory, "reactIntlMessages.json"),
        function(err, data) {
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
  const config = assign({}, globalConfig, {
    output: {
      path: t.context.directory,
      filename: "[id].metadata.js",
    },
  });

  webpack(config, (err, stats) => {
    t.is(err, null);
    t.is(stats.compilation.errors.length, 0);
    t.end();
  });
});

test.cb("should throw error", t => {
  const config = assign({}, globalConfig, {
    output: {
      path: t.context.directory,
      filename: "[id].metadata.js",
    },
    entry: "./test/fixtures/metadataErr.js",
  });

  webpack(config, (err, stats) => {
    t.is(err, null);
    t.true(stats.compilation.errors.length > 0);
    t.end();
  });
});

test.cb("should pass metadata code snippet ( cache version )", t => {
  const config = assign({}, globalConfig, {
    output: {
      path: t.context.directory,
      filename: "[id].metadata.js",
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          query: {
            metadataSubscribers: [ReactIntlPlugin.metadataContextFunctionName],
            plugins: [["react-intl", { enforceDescriptions: false }]],
            cacheDirectory: cacheDir,
            presets: [],
          },
          exclude: /node_modules/,
        },
      ],
    },
  });

  webpack(config, err => {
    t.is(err, null);

    fs.readdir(t.context.directory, (err, files) => {
      t.is(err, null);
      t.true(files.length > 0);
      fs.readFile(
        path.resolve(t.context.directory, "reactIntlMessages.json"),
        function(err, data) {
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
