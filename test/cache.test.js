import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { webpackAsync } from "./helpers/webpackAsync.js";
import createTestDirectory from "./helpers/createTestDirectory.js";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const context = { directory: undefined, cacheDirectory: undefined };

test.beforeEach(async t => {
  const directory = await createTestDirectory(outputDir, t.name);
  context.directory = directory;
  const cacheDirectory = await createTestDirectory(cacheDir, t.name);
  context.cacheDirectory = cacheDirectory;
});
test.beforeEach(() =>
  fs.rmSync(defaultCacheDir, { recursive: true, force: true }),
);
test.afterEach(() => {
  fs.rmSync(context.directory, { recursive: true, force: true });
  fs.rmSync(context.cacheDirectory, { recursive: true, force: true });
});

test("should output files to cache directory", async () => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: context.directory,
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: babelLoader,
          exclude: /node_modules/,
          options: {
            cacheDirectory: context.cacheDirectory,
            presets: ["@babel/preset-env"],
          },
        },
      ],
    },
  });

  const stats = await webpackAsync(config);
  assert.deepEqual(stats.compilation.errors, []);
  assert.deepEqual(stats.compilation.warnings, []);

  const files = fs.readdirSync(context.cacheDirectory);
  assert.ok(files.length > 0);
});

test("should output json.gz files to standard cache dir by default", async () => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: context.directory,
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
  assert.deepEqual(stats.compilation.errors, []);
  assert.deepEqual(stats.compilation.warnings, []);

  let files = fs.readdirSync(defaultCacheDir);
  files = files.filter(file => CACHE_FILE_REGEX.test(file));
  assert.ok(files.length > 0);
});

test("should output non-compressed files to standard cache dir when cacheCompression is set to false", async () => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: context.directory,
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
  assert.ok(files.length > 0);
});

test("should output files to standard cache dir if set to true in query", async () => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: context.directory,
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
  assert.deepEqual(stats.compilation.errors, []);
  assert.deepEqual(stats.compilation.warnings, []);

  let files = fs.readdirSync(defaultCacheDir);
  files = files.filter(file => CACHE_FILE_REGEX.test(file));
  assert.ok(files.length > 0);
});

test("should read from cache directory if cached file exists", async () => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: context.directory,
    },
    module: {
      rules: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          exclude: /node_modules/,
          options: {
            cacheDirectory: context.cacheDirectory,
            presets: ["@babel/preset-env"],
          },
        },
      ],
    },
  });

  // @TODO Find a way to know if the file as correctly read without relying on
  // Istanbul for coverage.
  const stats = await webpackAsync(config);
  assert.deepEqual(stats.compilation.errors, []);
  assert.deepEqual(stats.compilation.warnings, []);

  await webpackAsync(config);
  const files = fs.readdirSync(context.cacheDirectory);
  assert.ok(files.length > 0);
});

test("should have one file per module", async () => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: context.directory,
    },
    module: {
      rules: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          exclude: /node_modules/,
          options: {
            cacheDirectory: context.cacheDirectory,
            presets: ["@babel/preset-env"],
          },
        },
      ],
    },
  });

  const stats = await webpackAsync(config);
  assert.deepEqual(stats.compilation.errors, []);
  assert.deepEqual(stats.compilation.warnings, []);

  const files = fs.readdirSync(context.cacheDirectory);
  assert.strictEqual(files.length, 3);
});

test("should generate a new file if the identifier changes", async () => {
  const configs = [
    Object.assign({}, globalConfig, {
      output: {
        path: context.directory,
      },
      module: {
        rules: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            options: {
              cacheDirectory: context.cacheDirectory,
              cacheIdentifier: "a",
              presets: ["@babel/preset-env"],
            },
          },
        ],
      },
    }),
    Object.assign({}, globalConfig, {
      output: {
        path: context.directory,
      },
      module: {
        rules: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            options: {
              cacheDirectory: context.cacheDirectory,
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
      assert.deepEqual(stats.compilation.errors, []);
      assert.deepEqual(stats.compilation.warnings, []);
    }),
  );

  const files = fs.readdirSync(context.cacheDirectory);
  assert.strictEqual(files.length, 6);
});

test("should allow to specify the .babelrc file", async () => {
  const config = [
    Object.assign({}, globalConfig, {
      entry: path.join(__dirname, "fixtures/constant.js"),
      output: {
        path: context.directory,
      },
      module: {
        rules: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            options: {
              cacheDirectory: context.cacheDirectory,
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
        path: context.directory,
      },
      module: {
        rules: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            options: {
              cacheDirectory: context.cacheDirectory,
              presets: ["@babel/preset-env"],
            },
          },
        ],
      },
    }),
  ];
  const multiStats = await webpackAsync(config);
  assert.deepEqual(multiStats.stats[0].compilation.errors, []);
  assert.deepEqual(multiStats.stats[0].compilation.warnings, []);
  assert.deepEqual(multiStats.stats[1].compilation.errors, []);
  assert.deepEqual(multiStats.stats[1].compilation.warnings, []);

  const files = fs.readdirSync(context.cacheDirectory);
  // The two configs resolved to same Babel config because "fixtures/babelrc"
  // is { "presets": ["@babel/preset-env"] }
  assert.strictEqual(files.length, 1);
});

test("should cache result when there are external dependencies", async () => {
  const dep = path.join(cacheDir, "externalDependency.txt");

  fs.writeFileSync(dep, "first update");

  let counter = 0;

  const config = Object.assign({}, globalConfig, {
    entry: path.join(__dirname, "fixtures/constant.js"),
    output: {
      path: context.directory,
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: babelLoader,
          options: {
            babelrc: false,
            configFile: false,
            cacheDirectory: context.cacheDirectory,
            plugins: [
              api => {
                api.cache.never();
                api.addExternalDependency(dep);
                return {
                  visitor: {
                    BooleanLiteral(path) {
                      counter++;
                      path.replaceWith(
                        api.types.stringLiteral(fs.readFileSync(dep, "utf8")),
                      );
                      path.stop();
                    },
                  },
                };
              },
            ],
          },
        },
      ],
    },
  });

  let stats = await webpackAsync(config);
  assert.deepEqual(stats.compilation.warnings, []);
  assert.deepEqual(stats.compilation.errors, []);

  assert.ok(stats.compilation.fileDependencies.has(dep));
  assert.strictEqual(counter, 1);

  stats = await webpackAsync(config);
  assert.deepEqual(stats.compilation.warnings, []);
  assert.deepEqual(stats.compilation.errors, []);

  assert.ok(stats.compilation.fileDependencies.has(dep));
  assert.strictEqual(counter, 1);

  fs.writeFileSync(dep, "second update");
  stats = await webpackAsync(config);
  assert.deepEqual(stats.compilation.warnings, []);
  assert.deepEqual(stats.compilation.errors, []);

  assert.ok(stats.compilation.fileDependencies.has(dep));
  assert.strictEqual(counter, 2);
});

test("should output debug logs when stats.loggingDebug includes babel-loader", async () => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: context.directory,
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
    stats: {
      loggingDebug: ["babel-loader"],
    },
  });

  const stats = await webpackAsync(config);

  assert.match(
    stats.toString(config.stats),
    /normalizing loader options\n\s+resolving Babel configs\n\s+cache is enabled\n\s+reading cache file.+\n\s+discarded cache as it can not be read\n\s+creating cache folder.+\n\s+applying Babel transform\n\s+writing result to cache file.+\n\s+added '.+babel.config.json' to webpack dependencies/,
  );
});
