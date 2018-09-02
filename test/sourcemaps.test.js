import test from "ava";
import fs from "fs";
import path from "path";
import rimraf from "rimraf";
import webpack from "webpack";
import createTestDirectory from "./helpers/createTestDirectory";

const outputDir = path.join(__dirname, "output/sourcemaps");
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

test.cb("should output webpack's sourcemap", t => {
  const config = Object.assign({}, globalConfig, {
    devtool: "source-map",
    output: {
      path: t.context.directory,
    },
    module: {
      rules: [
        {
          test: /\.jsx?/,
          loader: babelLoader + "?presets[]=@babel/env",
          exclude: /node_modules/,
        },
      ],
    },
  });

  webpack(config, (err, stats) => {
    t.is(err, null);
    t.is(stats.compilation.errors.length, 0);
    t.is(stats.compilation.warnings.length, 0);

    fs.readdir(t.context.directory, (err, files) => {
      t.is(err, null);

      const map = files.filter(file => file.indexOf(".map") !== -1);

      t.true(map.length > 0);

      if (map.length > 0) {
        fs.readFile(path.resolve(t.context.directory, map[0]), (err, data) => {
          t.is(err, null);
          t.not(data.toString().indexOf("webpack:///"), -1);
          t.end();
        });
      }
    });
  });
});

test.cb("should output webpack's sourcemap properly when set 'inline'", t => {
  const config = Object.assign({}, globalConfig, {
    devtool: "source-map",
    output: {
      path: t.context.directory,
    },
    module: {
      rules: [
        {
          test: /\.jsx?/,
          loader: babelLoader + "?presets[]=@babel/env&sourceMap=inline",
          exclude: /node_modules/,
        },
      ],
    },
  });

  webpack(config, (err, stats) => {
    t.is(err, null);
    t.is(stats.compilation.errors.length, 0);
    t.is(stats.compilation.warnings.length, 0);

    fs.readdir(t.context.directory, (err, files) => {
      t.is(err, null);

      const map = files.filter(file => file.indexOf(".map") !== -1);

      t.true(map.length > 0);

      if (map.length > 0) {
        fs.readFile(path.resolve(t.context.directory, map[0]), (err, data) => {
          t.is(err, null);

          const mapObj = JSON.parse(data.toString());

          t.is(mapObj.sources[1], "webpack:///./test/fixtures/basic.js");

          // Ensure that the map contains the original code, not the
          // compiled src.
          t.is(mapObj.sourcesContent[1].indexOf("__esModule"), -1);
          t.end();
        });
      }
    });
  });
});

test.cb("should output webpack's devtoolModuleFilename option", t => {
  const config = Object.assign({}, globalConfig, {
    devtool: "source-map",
    output: {
      path: t.context.directory,
      devtoolModuleFilenameTemplate: "==[absolute-resource-path]==",
    },
    module: {
      rules: [
        {
          test: /\.jsx?/,
          loader: babelLoader + "?presets[]=@babel/env",
          exclude: /node_modules/,
        },
      ],
    },
  });

  webpack(config, (err, stats) => {
    t.is(err, null);
    t.is(stats.compilation.errors.length, 0);
    t.is(stats.compilation.warnings.length, 0);

    fs.readdir(t.context.directory, (err, files) => {
      t.is(err, null);

      const map = files.filter(file => file.indexOf(".map") !== -1);

      t.true(map.length > 0);

      if (map.length > 0) {
        fs.readFile(path.resolve(t.context.directory, map[0]), (err, data) => {
          t.is(err, null);

          // The full absolute path is included in the sourcemap properly
          t.not(
            data
              .toString()
              .indexOf(JSON.stringify(`==${globalConfig.entry}==`)),
            -1,
          );

          t.end();
        });
      }
    });
  });
});
