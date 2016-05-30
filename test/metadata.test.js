"use strict";

import fs from "fs";
import path from "path";
import assign from "object-assign";
import test from "ava";
import mkdirp from "mkdirp";
import rimraf from "rimraf";
import webpack from "webpack";
import ReactIntlPlugin from "react-intl-webpack-plugin";

const cacheDir = path.resolve(__dirname, "./output/cache/cachefiles");
const outputDir = path.resolve(__dirname, "./output/metadata");
const babelLoader = path.resolve(__dirname, "../");
const globalConfig = {
  entry: path.join(__dirname, "fixtures/metadata.js"),
  output: {
    path: outputDir,
    filename: "[id].metadata.js",
  },
  plugins: [new ReactIntlPlugin(),],
  module: {
    loaders: [
      {
        test: /\.jsx?/,
        loader: babelLoader,
        query: {
          metadataSubscribers: [ReactIntlPlugin.metadataContextFunctionName],
          plugins: [
            ["react-intl", {enforceDescriptions: false,},],
          ],
          presets: [],
        },
        exclude: /node_modules/,
      },
    ],
  },
};

// Create a separate directory for each test so that the tests
// can run in parallel
test.cb.beforeEach((t) => {
  const directory = path.join(outputDir, t.title.replace(/ /g, "_"));
  t.context.directory = directory;
  rimraf(directory, (err) => {
    if (err) return t.end(err);
    mkdirp(directory, t.end);
  });
});

test.cb.afterEach((t) => rimraf(t.context.directory, t.end));

test.cb("should pass metadata code snippet", function(t) {
  const config = assign({}, globalConfig, {
  });

  webpack(config, function(err) {
    t.is(err, null);

    fs.readdir(outputDir, function(err) {
      t.is(err, null);
      fs.readFile(path.resolve(outputDir, "reactIntlMessages.json"),
        function(err, data) {
          const text = data.toString();
          t.is(err, null);
          const jsonText = JSON.parse(text);
          t.is(jsonText.length, 1);
          t.is(jsonText[0].id, "greetingId");
          t.is(jsonText[0].defaultMessage, "Hello World!");

          t.end();
        });
    });
  });
});

test.cb("should not throw error ", function(t) {
  const config = assign({}, globalConfig, {});

  webpack(config, function(err, stats) {
    t.is(stats.compilation.errors.length, 0);
    t.end();
  });
});

test.cb("should throw error ", function(t) {
  const config = assign({}, globalConfig, {
    entry: "./test/fixtures/metadataErr.js",
  });

  webpack(config, function(err, stats) {
    t.true(stats.compilation.errors.length > 0);
    t.end();
  });
});

test.cb("should pass metadata code snippet (cache version)", function(t) {
  const config = assign({}, globalConfig, {
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          query: {
            metadataSubscribers:
              [ReactIntlPlugin.metadataContextFunctionName],
            plugins: [
              ["react-intl", {enforceDescriptions: false,},],
            ],
            cacheDirectory: cacheDir,
            presets: [],
          },
          exclude: /node_modules/,
        },
      ],
    },
  });

  webpack(config, function(err) {
    t.is(err, null);

    fs.readdir(outputDir, function(err) {
      t.is(err, null);
      fs.readFile(path.resolve(outputDir, "reactIntlMessages.json"),
        function(err, data) {
          const text = data.toString();
          t.is(err, null);
          const jsonText = JSON.parse(text);
          t.is(jsonText.length, 1);
          t.is(jsonText[0].id, "greetingId");
          t.is(jsonText[0].defaultMessage, "Hello World!");

          t.end();
        });
    });
  });
});
