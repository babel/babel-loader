import test from "ava";
import fs from "fs";
import path from "path";
import assign from "object-assign";
import rimraf from "rimraf";
import webpack from "webpack";
import mock from "mock-fs";
import createTestDirectory from "./helpers/createTestDirectory";

const defaultCacheDir = path.join(__dirname, "../node_modules/.cache/babel-loader");
const cacheDir = path.join(__dirname, "output/cache/cachefiles");
const outputDir = path.join(__dirname, "output/cache");
const babelLoader = path.join(__dirname, "../lib");

const globalConfig = {
  entry: path.join(__dirname, "fixtures/basic.js"),
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: babelLoader,
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
test.cb.beforeEach((t) => {
  createTestDirectory(cacheDir, t.title, (err, directory) => {
    if (err) return t.end(err);
    t.context.cacheDirectory = directory;
    t.end();
  });
});
test.cb.beforeEach((t) => rimraf(defaultCacheDir, t.end));
test.cb.afterEach((t) => rimraf(t.context.directory, t.end));
test.cb.afterEach((t) => rimraf(t.context.cacheDirectory, t.end));

test.cb("should output files to cache directory", (t) => {
  const config = assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
    module: {
      loaders: [
        {
          test: /\.js$/,
          loader: babelLoader,
          exclude: /node_modules/,
          query: {
            cacheDirectory: t.context.cacheDirectory,
            presets: ["es2015"],
          },
        },
      ],
    },
  });

  webpack(config, (err) => {
    t.is(err, null);

    fs.readdir(t.context.cacheDirectory, (err, files) => {
      t.is(err, null);
      t.true(files.length > 0);
      t.end();
    });
  });
});

test.cb.serial("should output json.gz files to standard cache dir by default", (t) => {
  const config = assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          exclude: /node_modules/,
          query: {
            cacheDirectory: true,
            presets: ["es2015"],
          },
        },
      ],
    },
  });

  webpack(config, (err) => {
    t.is(err, null);

    fs.readdir(defaultCacheDir, (err, files) => {
      files = files.filter((file) => /\b[0-9a-f]{5,40}\.json\.gz\b/.test(file));

      t.is(err, null);
      t.true(files.length > 0);
      t.end();
    });
  });
});

test.cb.serial("should output files to standard cache dir if set to true in query", (t) => {
  const config = assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: `${babelLoader}?cacheDirectory=true&presets[]=es2015`,
          exclude: /node_modules/,
        },
      ],
    },
  });

  webpack(config, (err) => {
    t.is(err, null);

    fs.readdir(defaultCacheDir, (err, files) => {
      files = files.filter((file) => /\b[0-9a-f]{5,40}\.json\.gz\b/.test(file));

      t.is(err, null);
      t.true(files.length > 0);
      t.end();
    });
  });
});

test.cb.skip("should read from cache directory if cached file exists", (t) => {
  const config = assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          exclude: /node_modules/,
          query: {
            cacheDirectory: t.context.cacheDirectory,
            presets: ["es2015"],
          },
        },
      ],
    },
  });

  // @TODO Find a way to know if the file as correctly read without relying on
  // Istanbul for coverage.
  webpack(config, (err) => {
    t.is(err, null);

    webpack(config, (err) => {
      t.is(err, null);
      fs.readdir(t.context.cacheDirectory, (err, files) => {
        t.is(err, null);
        t.true(files.length > 0);
        t.end();
      });
    });
  });

});

test.cb("should have one file per module", (t) => {
  const config = assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          exclude: /node_modules/,
          query: {
            cacheDirectory: t.context.cacheDirectory,
            presets: ["es2015"],
          },
        },
      ],
    },
  });

  webpack(config, (err) => {
    t.is(err, null);

    fs.readdir(t.context.cacheDirectory, (err, files) => {
      t.is(err, null);
      t.true(files.length === 3);
      t.end();
    });
  });
});

test.cb("should generate a new file if the identifier changes", (t) => {
  const configs = [
    assign({}, globalConfig, {
      output: {
        path: t.context.directory,
      },
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            query: {
              cacheDirectory: t.context.cacheDirectory,
              cacheIdentifier: "a",
              presets: ["es2015"],
            },
          },
        ],
      },
    }),
    assign({}, globalConfig, {
      output: {
        path: t.context.directory,
      },
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            query: {
              cacheDirectory: t.context.cacheDirectory,
              cacheIdentifier: "b",
              presets: ["es2015"],
            },
          },
        ],
      },
    }),
  ];
  let counter = configs.length;

  configs.forEach((config) => {
    webpack(config, (err) => {
      t.is(err, null);
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

test.cb("should allow to specify the .babelrc file", (t) => {
  const config = [
    assign({}, globalConfig, {
      entry: path.join(__dirname, "fixtures/constant.js"),
      output: {
        path: t.context.directory,
      },
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            query: {
              cacheDirectory: t.context.cacheDirectory,
              babelrc: path.join(__dirname, "fixtures/babelrc"),
              presets: ["es2015"],
            },
          },
        ],
      },
    }),
    assign({}, globalConfig, {
      entry: path.join(__dirname, "fixtures/constant.js"),
      output: {
        path: t.context.directory,
      },
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            query: {
              cacheDirectory: t.context.cacheDirectory,
              presets: ["es2015"],
            },
          },
        ],
      },
    }),
  ];

  webpack(config, (err) => {
    t.is(err, null);

    fs.readdir(t.context.cacheDirectory, (err, files) => {
      t.is(err, null);
      t.true(files.length === 2);
      t.end();
    });
  });
});

// TODO all the following tests should be done without webpack, as the combination
// of mock-fs and webpack seems to be not reliable.

test.cb.serial("has error if custom cache directory cannot be created", (t) => {
  const config = assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          exclude: /node_modules/,
          query: {
            cacheDirectory: t.context.cacheDirectory,
            presets: [],
            babelrc: false,
          },
        },
      ],
    },
  });

  mock({
    [path.dirname(t.context.cacheDirectory)]: mock.directory({
      mode: 0o444,
    })
  });
  webpack(config, (err, stats) => {
    t.is(err, null);
    t.is(stats.hasErrors(), true);
    t.regex(stats.toJson().errors[0], /EACCES, permission denied/);
    mock.restore();
    t.end();
  });
});

test.cb.serial("falls back to tmp dir if default dir is not writable", (t) => {
  const config = assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          exclude: /node_modules/,
          query: {
            cacheDirectory: true,
            presets: [],
            babelrc: false,
          },
        },
      ],
    },
  });

  mock({
    [path.join(__dirname, "../package.json")]: mock.file(),
    [path.dirname(defaultCacheDir)]: mock.directory({
      mode: 0o444,
    })
  });
  webpack(config, (err, stats) => {
    t.is(err, null);
    t.is(stats.hasErrors(), false);
    mock.restore();
    t.end();
  });
});

test.cb.serial("falls back to tmp dir if no cache dir found", (t) => {
  const config = assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          exclude: /node_modules/,
          query: {
            cacheDirectory: true,
            presets: [],
            babelrc: false,
          },
        },
      ],
    },
  });

  mock({
    [path.dirname(defaultCacheDir)]: mock.directory({
      mode: 0o444,
    })
  });
  webpack(config, (err, stats) => {
    t.is(err, null);
    t.is(stats.hasErrors(), false);
    mock.restore();
    t.end();
  });
});


test.cb.serial("reports errors from babel transpile", (t) => {
  const config = assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          exclude: /node_modules/,
          query: {
            cacheDirectory: true,
            presets: ["es2015"],
          },
        },
      ],
    },
  });

  mock();
  webpack(config, (err, stats) => {
    t.is(err, null);
    t.is(stats.hasErrors(), true);
    t.regex(stats.toJson().errors[0], /ENOENT, no such file or directory/);
    t.regex(stats.toJson().errors[0], /\.babelrc/);
    mock.restore();
    t.end();
  });
});

