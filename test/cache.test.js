import test from "ava";
import fs from "fs";
import path from "path";
import rimraf from "rimraf";
import webpack from "webpack";
import createTestDirectory from "./helpers/createTestDirectory";

const defaultCacheDir = path.join(
  __dirname,
  "../node_modules/.cache/babel-loader",
);
const cacheDir = path.join(__dirname, "output/cache/cachefiles");
const outputDir = path.join(__dirname, "output/cache");
const babelLoader = path.join(__dirname, "../lib");

const globalConfig = {
  mode: "development",
  entry: path.join(__dirname, "fixtures/basic.js"),
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: babelLoader,
        exclude: /node_modules/,
      },
    ],
  },
};

// Cache filename is either SHA256 or MD5 hash
const UNCOMPRESSED_CACHE_FILE_REGEX = /^[0-9a-f]{32}(?:[0-9a-f]{32})?\.json$/;
const CACHE_FILE_REGEX = /^[0-9a-f]{32}(?:[0-9a-f]{32})?\.json\.gz$/;

// Create a separate directory for each test so that the tests
// can run in parallel

test.beforeEach.cb(t => {
  createTestDirectory(outputDir, t.title, (err, directory) => {
    if (err) return t.end(err);
    t.context.directory = directory;
    t.end();
  });
});
test.beforeEach.cb(t => {
  createTestDirectory(cacheDir, t.title, (err, directory) => {
    if (err) return t.end(err);
    t.context.cacheDirectory = directory;
    t.end();
  });
});
test.beforeEach.cb(t => rimraf(defaultCacheDir, t.end));
test.afterEach.cb(t => rimraf(t.context.directory, t.end));
test.afterEach.cb(t => rimraf(t.context.cacheDirectory, t.end));

test.cb("should output files to cache directory", t => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: babelLoader,
          exclude: /node_modules/,
          options: {
            cacheDirectory: t.context.cacheDirectory,
            presets: ["@babel/preset-env"],
          },
        },
      ],
    },
  });

  webpack(config, (err, stats) => {
    t.is(err, null);
    t.deepEqual(stats.compilation.errors, []);
    t.deepEqual(stats.compilation.warnings, []);

    fs.readdir(t.context.cacheDirectory, (err, files) => {
      t.is(err, null);
      t.true(files.length > 0);
      t.end();
    });
  });
});

test.serial.cb(
  "should output json.gz files to standard cache dir by default",
  t => {
    const config = Object.assign({}, globalConfig, {
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
              cacheDirectory: true,
              presets: ["@babel/preset-env"],
            },
          },
        ],
      },
    });

    webpack(config, (err, stats) => {
      t.is(err, null);
      t.deepEqual(stats.compilation.errors, []);
      t.deepEqual(stats.compilation.warnings, []);

      fs.readdir(defaultCacheDir, (err, files) => {
        files = files.filter(file => CACHE_FILE_REGEX.test(file));

        t.is(err, null);
        t.true(files.length > 0);
        t.end();
      });
    });
  },
);

test.serial.cb(
  "should output non-compressed files to standard cache dir when cacheCompression is set to false",
  t => {
    const config = Object.assign({}, globalConfig, {
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
              cacheDirectory: true,
              cacheCompression: false,
              presets: ["@babel/preset-env"],
            },
          },
        ],
      },
    });

    webpack(config, err => {
      t.is(err, null);

      fs.readdir(defaultCacheDir, (err, files) => {
        files = files.filter(file => UNCOMPRESSED_CACHE_FILE_REGEX.test(file));

        t.is(err, null);
        t.true(files.length > 0);
        t.end();
      });
    });
  },
);

test.serial.cb(
  "should output files to standard cache dir if set to true in query",
  t => {
    const config = Object.assign({}, globalConfig, {
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
              cacheDirectory: true,
              presets: ["@babel/preset-env"],
            },
          },
        ],
      },
    });

    webpack(config, (err, stats) => {
      t.is(err, null);
      t.deepEqual(stats.compilation.errors, []);
      t.deepEqual(stats.compilation.warnings, []);

      fs.readdir(defaultCacheDir, (err, files) => {
        files = files.filter(file => CACHE_FILE_REGEX.test(file));

        t.is(err, null);

        t.true(files.length > 0);
        t.end();
      });
    });
  },
);

test.cb("should read from cache directory if cached file exists", t => {
  const config = Object.assign({}, globalConfig, {
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
            cacheDirectory: t.context.cacheDirectory,
            presets: ["@babel/preset-env"],
          },
        },
      ],
    },
  });

  // @TODO Find a way to know if the file as correctly read without relying on
  // Istanbul for coverage.
  webpack(config, (err, stats) => {
    t.is(err, null);
    t.deepEqual(stats.compilation.errors, []);
    t.deepEqual(stats.compilation.warnings, []);

    webpack(config, err => {
      t.is(err, null);
      fs.readdir(t.context.cacheDirectory, (err, files) => {
        t.is(err, null);
        t.true(files.length > 0);
        t.end();
      });
    });
  });
});

test.cb("should have one file per module", t => {
  const config = Object.assign({}, globalConfig, {
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
            cacheDirectory: t.context.cacheDirectory,
            presets: ["@babel/preset-env"],
          },
        },
      ],
    },
  });

  webpack(config, (err, stats) => {
    t.is(err, null);
    t.deepEqual(stats.compilation.errors, []);
    t.deepEqual(stats.compilation.warnings, []);

    fs.readdir(t.context.cacheDirectory, (err, files) => {
      t.is(err, null);
      t.true(files.length === 3);
      t.end();
    });
  });
});

test.cb("should generate a new file if the identifier changes", t => {
  const configs = [
    Object.assign({}, globalConfig, {
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
              cacheDirectory: t.context.cacheDirectory,
              cacheIdentifier: "a",
              presets: ["@babel/preset-env"],
            },
          },
        ],
      },
    }),
    Object.assign({}, globalConfig, {
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
              cacheDirectory: t.context.cacheDirectory,
              cacheIdentifier: "b",
              presets: ["@babel/preset-env"],
            },
          },
        ],
      },
    }),
  ];
  let counter = configs.length;

  configs.forEach(config => {
    webpack(config, (err, stats) => {
      t.is(err, null);
      t.deepEqual(stats.compilation.errors, []);
      t.deepEqual(stats.compilation.warnings, []);
      counter -= 1;

      if (!counter) {
        fs.readdir(t.context.cacheDirectory, (err, files) => {
          t.is(err, null);
          t.true(files.length === 6);
          t.end();
        });
      }
    });
  });
});

test.cb("should allow to specify the .babelrc file", t => {
  const config = [
    Object.assign({}, globalConfig, {
      entry: path.join(__dirname, "fixtures/constant.js"),
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
              cacheDirectory: t.context.cacheDirectory,
              extends: path.join(__dirname, "fixtures/babelrc"),
              babelrc: false,
              presets: ["@babel/preset-env"],
            },
          },
        ],
      },
    }),
    Object.assign({}, globalConfig, {
      entry: path.join(__dirname, "fixtures/constant.js"),
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
              cacheDirectory: t.context.cacheDirectory,
              presets: ["@babel/preset-env"],
            },
          },
        ],
      },
    }),
  ];

  webpack(config, (err, multiStats) => {
    t.is(err, null);
    t.deepEqual(multiStats.stats[0].compilation.errors, []);
    t.deepEqual(multiStats.stats[0].compilation.warnings, []);
    t.deepEqual(multiStats.stats[1].compilation.errors, []);
    t.deepEqual(multiStats.stats[1].compilation.warnings, []);

    fs.readdir(t.context.cacheDirectory, (err, files) => {
      t.is(err, null);
      t.true(files.length === 2);
      t.end();
    });
  });
});
