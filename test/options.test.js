import test from "ava";
import fs from "fs";
import path from "path";
import assign from "object-assign";
import mkdirp from "mkdirp";
import rimraf from "rimraf";
import webpack from "webpack";

const outputDir = path.resolve(__dirname, "output/options");
const babelLoader = path.resolve(__dirname, "..");
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
test.cb.beforeEach((t) => {
  const directory = path.join(outputDir, t.title.replace(/ /g, "_"));
  t.context.directory = directory;
  rimraf(directory, (err) => {
    if (err) return t.end(err);
    mkdirp(directory, t.end);
  });
});

test.cb.afterEach((t) => rimraf(t.context.directory, t.end));

test.cb("should interpret options given to the loader", (t) => {
  const config = assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader + "?presets[]=es2015",
          exclude: /node_modules/,
        },
      ],
    },
  });

  webpack(config, (err) => {
    t.is(err, null);

    fs.readdir(outputDir, (err, files) => {
      t.is(err, null);
      t.true(files.length > 0);

      t.end();
    });
  });
});
