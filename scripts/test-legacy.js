const webpack = require("webpack");
const path = require("path");
const fs = require("fs");
const assert = require("assert");

const babelLoader = path.join(__dirname, "../lib");

const config = {
  mode: "development",
  entry: path.join(__dirname, "test-legacy-source/input.js"),
  output: {
    path: path.join(__dirname, "test-legacy-source/output"),
  },
  module: {
    rules: [
      {
        test: /\.jsx?/,
        loader: babelLoader,
        options: {
          presets: ["@babel/preset-env"],
        },
        exclude: /node_modules/,
      },
    ],
  },
};

webpack(config, (err, stats) => {
  assert.strictEqual(err, null);
  assert.deepStrictEqual(stats.compilation.errors, []);
  assert.deepStrictEqual(stats.compilation.warnings, []);

  fs.readdir(path.join(__dirname, "test-legacy-source/output"), (err, files) => {
    assert.strictEqual(err, null);
    assert.strictEqual(files.length, 1);
    fs.readFile(path.join(__dirname, "test-legacy-source/output", files[0]), (err, data) => {
      assert.strictEqual(err, null);
      const test = "var App = function App()";
      const subject = data.toString();

      assert.notStrictEqual(subject.indexOf(test), -1);

      console.log("DONE");
      clearTimeout(timeout);
    });
  });
});

const timeout = setTimeout(() => {
  console.error("TIMEOUT");
  process.exit(1);
}, 10 * 1000);
