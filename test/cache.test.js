import test from "ava";
import fs from "fs";
import path from "path";
import { webpackAsync } from "./helpers/webpackAsync.js";
import createTestDirectory from "./helpers/createTestDirectory.js";

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

test.beforeEach(async t => {
  const directory = await createTestDirectory(outputDir, t.title);
  t.context.directory = directory;
  const cacheDirectory = await createTestDirectory(cacheDir, t.title);
  t.context.cacheDirectory = cacheDirectory;
});
test.beforeEach(() =>
  fs.rmSync(defaultCacheDir, { recursive: true, force: true }),
);
test.afterEach(t => {
  fs.rmSync(t.context.directory, { recursive: true, force: true });
  fs.rmSync(t.context.cacheDirectory, { recursive: true, force: true });
});

test("should output files to cache directory", async t => {
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

  const stats = await webpackAsync(config);
  t.deepEqual(stats.compilation.errors, []);
  t.deepEqual(stats.compilation.warnings, []);

  const files = fs.readdirSync(t.context.cacheDirectory);
  t.true(files.length > 0);
});

test("should output json.gz files to standard cache dir by default", async t => {
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

  const stats = await webpackAsync(config);
  t.deepEqual(stats.compilation.errors, []);
  t.deepEqual(stats.compilation.warnings, []);

  let files = fs.readdirSync(defaultCacheDir);
  files = files.filter(file => CACHE_FILE_REGEX.test(file));
  t.true(files.length > 0);
});

test("should output non-compressed files to standard cache dir when cacheCompression is set to false", async t => {
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

  await webpackAsync(config);
  let files = fs.readdirSync(defaultCacheDir);
  files = files.filter(file => UNCOMPRESSED_CACHE_FILE_REGEX.test(file));
  t.true(files.length > 0);
});

test("should output files to standard cache dir if set to true in query", async t => {
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

  const stats = await webpackAsync(config);
  t.deepEqual(stats.compilation.errors, []);
  t.deepEqual(stats.compilation.warnings, []);

  let files = fs.readdirSync(defaultCacheDir);
  files = files.filter(file => CACHE_FILE_REGEX.test(file));
  t.true(files.length > 0);
});

test("should read from cache directory if cached file exists", async t => {
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
  const stats = await webpackAsync(config);
  t.deepEqual(stats.compilation.errors, []);
  t.deepEqual(stats.compilation.warnings, []);

  await webpackAsync(config);
  const files = fs.readdirSync(t.context.cacheDirectory);
  t.true(files.length > 0);
});

test("should have one file per module", async t => {
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

  const stats = await webpackAsync(config);
  t.deepEqual(stats.compilation.errors, []);
  t.deepEqual(stats.compilation.warnings, []);

  const files = fs.readdirSync(t.context.cacheDirectory);
  t.true(files.length === 3);
});

test("should generate a new file if the identifier changes", async t => {
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

  await Promise.allSettled(
    configs.map(async config => {
      const stats = await webpackAsync(config);
      t.deepEqual(stats.compilation.errors, []);
      t.deepEqual(stats.compilation.warnings, []);
    }),
  );

  const files = fs.readdirSync(t.context.cacheDirectory);
  t.true(files.length === 6);
});

test("should allow to specify the .babelrc file", async t => {
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
  const multiStats = await webpackAsync(config);
  t.deepEqual(multiStats.stats[0].compilation.errors, []);
  t.deepEqual(multiStats.stats[0].compilation.warnings, []);
  t.deepEqual(multiStats.stats[1].compilation.errors, []);
  t.deepEqual(multiStats.stats[1].compilation.warnings, []);

  const files = fs.readdirSync(t.context.cacheDirectory);
  t.true(files.length === 2);
});
