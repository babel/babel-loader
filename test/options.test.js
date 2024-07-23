import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { webpackAsync } from "./helpers/webpackAsync.js";
import createTestDirectory from "./helpers/createTestDirectory.js";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, "output/options");
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
        options: {
          presets: ["@babel/env"],
        },
      },
    ],
  },
};

// Create a separate directory for each test so that the tests
// can run in parallel
const context = { directory: undefined };
test.beforeEach(async t => {
  const directory = await createTestDirectory(outputDir, t.name);
  context.directory = directory;
});

test.afterEach(() =>
  fs.rmSync(context.directory, { recursive: true, force: true }),
);

test("should interpret options given to the loader", async () => {
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
            presets: ["@babel/env"],
          },
        },
      ],
    },
  });
  const stats = await webpackAsync(config);
  assert.deepEqual(stats.compilation.errors, []);
  assert.deepEqual(stats.compilation.warnings, []);

  const files = fs.readdirSync(outputDir);
  assert.ok(files.length > 0);
});

test("should throw when options.metadataSubscribers is not an array", async () => {
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
            metadataSubscribers: function subscriber() {},
          },
        },
      ],
    },
  });
  const stats = await webpackAsync(config);
  const { errors } = stats.compilation;
  assert.deepEqual(errors.length, 1);
  const errorMessage = errors[0].message;
  assert.match(
    errorMessage,
    /ValidationError: Invalid options object\. Babel Loader has been initialized using an options object that does not match the API schema\./,
  );
  assert.match(errorMessage, /options\.metadataSubscribers should be an array/);
});

test("should throw when options.customize is not a string", async () => {
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
            customize: true,
          },
        },
      ],
    },
  });
  const stats = await webpackAsync(config);
  const { errors } = stats.compilation;
  assert.deepEqual(errors.length, 1);
  const errorMessage = errors[0].message;
  assert.match(
    errorMessage,
    /ValidationError: Invalid options object\. Babel Loader has been initialized using an options object that does not match the API schema\./,
  );
  assert.match(
    errorMessage,
    /options\.customize should be one of these:\s null | string/,
  );
});

test("should throw when options.customize is not an absolute path", async () => {
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
            customize: "./node_modules/babel-loader-customized",
          },
        },
      ],
    },
  });
  const stats = await webpackAsync(config);
  const { errors } = stats.compilation;
  assert.deepEqual(errors.length, 1);
  const errorMessage = errors[0].message;
  assert.match(
    errorMessage,
    /Error: Customized loaders must be passed as absolute paths, since babel-loader has no way to know what they would be relative to\./,
  );
});

test("should warn when options.babelrc is a string", async () => {
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
            babelrc: "./fixtures/babelrc",
          },
        },
      ],
    },
  });
  const stats = await webpackAsync(config);
  const { warnings } = stats.compilation;
  assert.deepEqual(warnings.length, 1);
  const warningMessage = warnings[0].message;
  assert.match(
    warningMessage,
    /The option `babelrc` should not be set to a string anymore in the babel-loader config\./,
  );
});

test("should warn when options.forceEnv is set", async () => {
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
            forceEnv: "production",
          },
        },
      ],
    },
  });
  const stats = await webpackAsync(config);
  const { warnings } = stats.compilation;
  assert.deepEqual(warnings.length, 1);
  const warningMessage = warnings[0].message;
  assert.match(
    warningMessage,
    /The option `forceEnv` has been removed in favor of `envName` in Babel 7\./,
  );
});
