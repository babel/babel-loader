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

test.cb.beforeEach(t => {
  createTestDirectory(outputDir, t.title, (err, directory) => {
    if (err) return t.end(err);
    t.context.directory = directory;
    t.end();
  });
});
test.cb.beforeEach(t => {
  createTestDirectory(cacheDir, t.title, (err, directory) => {
    if (err) return t.end(err);
    t.context.cacheDirectory = directory;
    t.end();
  });
});
test.cb.beforeEach(t => rimraf(defaultCacheDir, t.end));
test.cb.afterEach(t => rimraf(t.context.directory, t.end));
test.cb.afterEach(t => rimraf(t.context.cacheDirectory, t.end));

test.cb("should output files to cache directory", t => {
  const config = Object.assign({}, globalConfig, {
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
            presets: ["@babel/preset-env"],
          },
        },
      ],
    },
  });

  webpack(config, err => {
    t.is(err, null);

    fs.readdir(t.context.cacheDirectory, (err, files) => {
      t.is(err, null);
      t.true(files.length > 0);
      t.end();
    });
  });
});

test.cb.serial(
  "should output json.gz files to standard cache dir by default",
  t => {
    const config = Object.assign({}, globalConfig, {
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
              presets: ["@babel/preset-env"],
            },
          },
        ],
      },
    });

    webpack(config, err => {
      t.is(err, null);

      fs.readdir(defaultCacheDir, (err, files) => {
        files = files.filter(file => /\b[0-9a-f]{5,40}\.json\.gz\b/.test(file));

        t.is(err, null);
        t.true(files.length > 0);
        t.end();
      });
    });
  },
);

test.cb.serial(
  "should output files to standard cache dir if set to true in query",
  t => {
    const config = Object.assign({}, globalConfig, {
      output: {
        path: t.context.directory,
      },
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: `${babelLoader}?cacheDirectory=true&presets[]=@babel/preset-env`,
            exclude: /node_modules/,
          },
        ],
      },
    });

    webpack(config, err => {
      t.is(err, null);

      fs.readdir(defaultCacheDir, (err, files) => {
        files = files.filter(file => /\b[0-9a-f]{5,40}\.json\.gz\b/.test(file));

        t.is(err, null);

        t.true(files.length > 0);
        t.end();
      });
    });
  },
);

test.cb.skip("should read from cache directory if cached file exists", t => {
  const config = Object.assign({}, globalConfig, {
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
            presets: ["@babel/preset-env"],
          },
        },
      ],
    },
  });

  // @TODO Find a way to know if the file as correctly read without relying on
  // Istanbul for coverage.
  webpack(config, err => {
    t.is(err, null);

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
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          exclude: /node_modules/,
          query: {
            cacheDirectory: t.context.cacheDirectory,
            presets: ["@babel/preset-env"],
          },
        },
      ],
    },
  });

  webpack(config, err => {
    t.is(err, null);

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
        loaders: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            query: {
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
        loaders: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            query: {
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
    webpack(config, err => {
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

test.cb("should allow to specify the .babelrc file", t => {
  const config = [
    Object.assign({}, globalConfig, {
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
        loaders: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            query: {
              cacheDirectory: t.context.cacheDirectory,
              presets: ["@babel/preset-env"],
            },
          },
        ],
      },
    }),
  ];

  webpack(config, err => {
    t.is(err, null);

    fs.readdir(t.context.cacheDirectory, (err, files) => {
      t.is(err, null);
      t.true(files.length === 2);
      t.end();
    });
  });
});
