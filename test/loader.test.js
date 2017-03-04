import test from "ava";
import fs from "fs";
import path from "path";
import assign from "object-assign";
import rimraf from "rimraf";
import webpack from "webpack";
import createTestDirectory from "./helpers/createTestDirectory";

const outputDir = path.join(__dirname, "output/loader");
const babelLoader = path.join(__dirname, "../lib");
const globalConfig = {
  entry: path.join(__dirname, "fixtures/basic.js"),
  module: {
    loaders: [
      {
        test: /\.jsx?/,
        loader: babelLoader,
        query: {
          presets: ["env"],
        },
        exclude: /node_modules/,
      },
    ],
  },
};

// Create a separate directory for each test so that the tests
// can run in parallel
test.cb.beforeEach((t) => {
  createTestDirectory(outputDir, t.title, (err, directory) => {
    if (err) return t.end(err);
    t.context.directory = directory;
    t.end();
  });
});

test.cb.afterEach((t) => rimraf(t.context.directory, t.end));

test.cb("should transpile the code snippet", (t) => {
  const config = assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
  });

  webpack(config, (err) => {
    t.is(err, null);

    fs.readdir(t.context.directory, (err, files) => {
      t.is(err, null);
      t.true(files.length === 1);
      fs.readFile(path.resolve(t.context.directory, files[0]), (err, data) => {
        t.is(err, null);
        const test = "var App = function App()";
        const subject = data.toString();

        t.not(subject.indexOf(test), -1);

        t.end();
      });
    });
  });
});

test.cb("should not throw error on syntax error", (t) => {
  const config = assign({}, globalConfig, {
    entry: path.join(__dirname, "fixtures/syntax.js"),
    output: {
      path: t.context.directory,
    },
  });

  webpack(config, (err, stats) => {
    t.true(stats.compilation.errors.length === 1);
    t.true(stats.compilation.errors[0] instanceof Error);

    t.end();
  });
});

test.cb("should use correct env", (t) => {
  const config = {
    entry: path.join(__dirname, "fixtures/basic.js"),
    output: {
      path: t.context.directory,
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          query: {
            forceEnv: "testenv",
            env: {
              testenv: {
                presets: ["es2015abc"],
              },
              otherenv: {
                presets: ["es2015xyz"],
              }
            }
          },
          exclude: /node_modules/,
        },
      ],
    },
  };

  webpack(config, (err, stats) => {
    t.is(err, null);

    t.true(stats.compilation.errors.length === 1);

    t.truthy(stats.compilation.errors[0].message.match(/es2015abc/));
    t.falsy(stats.compilation.errors[0].message.match(/es2015xyz/));

    t.end();
  });
});
