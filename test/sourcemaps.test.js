import test from "ava";
import fs from "fs";
import path from "path";
import rimraf from "rimraf";
import webpack from "webpack";
import createTestDirectory from "./helpers/createTestDirectory";
import isWebpack5 from "./helpers/isWebpack5";

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
test.beforeEach.cb(t => {
  createTestDirectory(outputDir, t.title, (err, directory) => {
    if (err) return t.end(err);
    t.context.directory = directory;
    t.end();
  });
});

test.afterEach.cb(t => rimraf(t.context.directory, t.end));

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
          loader: babelLoader,
          exclude: /node_modules/,
          options: {
            presets: ["@babel/env"],
          },
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

      const map = files.filter(file => file.includes(".map"));

      t.true(map.length > 0);

      if (map.length > 0) {
        fs.readFile(path.resolve(t.context.directory, map[0]), (err, data) => {
          t.is(err, null);
          t.truthy(
            data.toString().includes(isWebpack5 ? "webpack://" : "webpack:///"),
          );
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
          loader: babelLoader,
          exclude: /node_modules/,
          options: {
            sourceMap: "inline",
            presets: [["@babel/env", { modules: "commonjs" }]],
          },
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

      const map = files.filter(file => file.includes(".map"));

      t.true(map.length > 0);

      if (map.length > 0) {
        fs.readFile(path.resolve(t.context.directory, map[0]), (err, data) => {
          t.is(err, null);

          const mapObj = JSON.parse(data.toString());

          if (isWebpack5) {
            t.is(
              mapObj.sources[3],
              "webpack://babel-loader/./test/fixtures/basic.js",
            );

            // Ensure that the map contains the original code, not the compiled src.
            t.falsy(mapObj.sourcesContent[3].includes("__esModule"));
          } else {
            t.is(mapObj.sources[1], "webpack:///./test/fixtures/basic.js");

            // Ensure that the map contains the original code, not the compiled src.
            t.falsy(mapObj.sourcesContent[1].includes("__esModule"));
          }
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
      devtoolModuleFilenameTemplate: "=!=!=!=[absolute-resource-path]=!=!=!=",
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

  webpack(config, (err, stats) => {
    t.is(err, null);
    t.deepEqual(stats.compilation.errors, []);
    t.deepEqual(stats.compilation.warnings, []);

    fs.readdir(t.context.directory, (err, files) => {
      t.is(err, null);

      const map = files.filter(file => file.includes(".map"));

      t.true(map.length > 0);

      if (map.length > 0) {
        fs.readFile(path.resolve(t.context.directory, map[0]), (err, data) => {
          t.is(err, null);

          // The full absolute path is included in the sourcemap properly
          t.regex(
            data.toString(),
            new RegExp(
              JSON.stringify(
                `=!=!=!=${globalConfig.entry.replace(
                  // Webpack 5, webpack 4, windows, linux, ...
                  /\\/g,
                  "(?:/|\\\\)",
                )}=!=!=!=`,
              ),
            ),
          );

          t.end();
        });
      }
    });
  });
});

test.cb("should disable sourcemap output with 'sourceMaps:false'", t => {
  const config = Object.assign({}, globalConfig, {
    devtool: "source-map",
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
            sourceMaps: false,
            presets: [["@babel/env", { modules: "commonjs" }]],
          },
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

      const map = files.filter(file => file.includes(".map"));

      t.true(map.length > 0);

      if (map.length > 0) {
        fs.readFile(path.resolve(t.context.directory, map[0]), (err, data) => {
          t.is(err, null);

          const mapObj = JSON.parse(data.toString());

          if (isWebpack5) {
            t.is(
              mapObj.sources[3],
              "webpack://babel-loader/./test/fixtures/basic.js",
            );

            // Ensure that the code contains Babel's compiled output, because
            // sourcemaps from Babel are disabled.
            t.truthy(mapObj.sourcesContent[3].includes("__esModule"));
          } else {
            t.is(mapObj.sources[1], "webpack:///./test/fixtures/basic.js");

            // Ensure that the code contains Babel's compiled output, because
            // sourcemaps from Babel are disabled.
            t.truthy(mapObj.sourcesContent[1].includes("__esModule"));
          }

          t.end();
        });
      }
    });
  });
});

test.cb("should disable sourcemap output with 'sourceMap:false'", t => {
  const config = Object.assign({}, globalConfig, {
    devtool: "source-map",
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
            sourceMap: false,
            presets: [["@babel/env", { modules: "commonjs" }]],
          },
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

      const map = files.filter(file => file.includes(".map"));

      t.true(map.length > 0);

      if (map.length > 0) {
        fs.readFile(path.resolve(t.context.directory, map[0]), (err, data) => {
          t.is(err, null);

          const mapObj = JSON.parse(data.toString());

          if (isWebpack5) {
            t.is(
              mapObj.sources[3],
              "webpack://babel-loader/./test/fixtures/basic.js",
            );

            // Ensure that the code contains Babel's compiled output, because
            // sourcemaps from Babel are disabled.
            t.truthy(mapObj.sourcesContent[3].includes("__esModule"));
          } else {
            t.is(mapObj.sources[1], "webpack:///./test/fixtures/basic.js");

            // Ensure that the code contains Babel's compiled output, because
            // sourcemaps from Babel are disabled.
            t.truthy(mapObj.sourcesContent[1].includes("__esModule"));
          }

          t.end();
        });
      }
    });
  });
});
