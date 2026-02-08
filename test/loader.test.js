import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { satisfies } from "semver";
import createTestDirectory from "./helpers/createTestDirectory.js";
import { bundlers } from "./helpers/bundlers.js";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const babelLoader = path.join(__dirname, "../lib");
const globalConfig = {
  mode: "development",
  entry: path.join(__dirname, "fixtures/basic.js"),
  module: {
    rules: [
      {
        test: /\.jsx?/,
        loader: babelLoader,
        options: {
          targets: "chrome 42",
          assumptions: {
            arrayLikeIsIterable: true,
            constantReexports: true,
            ignoreFunctionLength: true,
            ignoreToPrimitiveHint: true,
            mutableTemplateObject: true,
            noClassCalls: true,
            noDocumentAll: true,
            objectRestNoSymbols: true,
            privateFieldsAsProperties: true,
            pureGetters: true,
            setClassMethods: true,
            setComputedProperties: true,
            setPublicClassFields: true,
            setSpreadProperties: true,
            skipForOfIteratorClosing: true,
            superIsCallableConstructor: true,
          },
          presets: [
            ["@babel/preset-env", { exclude: ["transform-typeof-symbol"] }],
          ],
          configFile: false,
          babelrc: false,
        },
        exclude: /node_modules/,
      },
    ],
  },
};

for (const bundler of bundlers) {
  test.describe(bundler.name, () => {
    const outputDir = path.join(__dirname, "output/loader", bundler.name);

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

    test("should transpile the code snippet", async () => {
      const config = Object.assign({}, globalConfig, {
        output: {
          path: context.directory,
        },
      });

      const stats = await bundler.compileAsync(config);
      assert.equal(stats.compilation.errors.length, 0);
      assert.equal(stats.compilation.warnings.length, 0);

      const files = fs.readdirSync(context.directory);
      assert.ok(files.length === 1);

      const test = /var App = .*(?:_createClass\()?function App\(arg\)/;
      const subject = fs.readFileSync(
        path.resolve(context.directory, files[0]),
        "utf8",
      );

      assert.match(subject, test);
    });

    test("should not throw error on syntax error", async () => {
      const config = Object.assign({}, globalConfig, {
        entry: path.join(__dirname, "fixtures/syntax.js"),
        output: {
          path: context.directory,
        },
      });

      const stats = await bundler.compileAsync(config);
      assert.ok(stats.compilation.errors.length === 1);
      assert.ok(stats.compilation.errors[0] instanceof Error);
      assert.equal(stats.compilation.warnings.length, 0);
    });

    test("should not throw without config", async () => {
      const config = {
        mode: "development",
        entry: path.join(__dirname, "fixtures/basic.js"),
        output: {
          path: context.directory,
        },
        module: {
          rules: [
            {
              test: /\.jsx?/,
              use: babelLoader,
              exclude: /node_modules/,
            },
          ],
        },
      };

      const stats = await bundler.compileAsync(config);
      assert.equal(stats.compilation.errors.length, 0);
      assert.equal(stats.compilation.warnings.length, 0);
    });

    test("should return compilation errors with the message included in the stack trace", async () => {
      const config = Object.assign({}, globalConfig, {
        entry: path.join(__dirname, "fixtures/syntax.js"),
        output: {
          path: context.directory,
        },
      });
      const stats = await bundler.compileAsync(config);
      assert.equal(stats.compilation.warnings.length, 0);
      const moduleBuildError = stats.compilation.errors[0];
      const babelLoaderError = moduleBuildError.error;
      assert.match(
        babelLoaderError.stack ?? moduleBuildError.message,
        /Unexpected token/,
      );
    });

    test("should load ESM config files", async () => {
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
              exclude: /node_modules/,
              options: {
                // Use relative path starting with a dot to satisfy module loader.
                // https://github.com/nodejs/node/issues/31710
                // File urls doesn't work with current resolve@1.12.0 package.
                extends: (
                  "." +
                  path.sep +
                  path.relative(
                    process.cwd(),
                    path.resolve(__dirname, "fixtures/babelrc.mjs"),
                  )
                ).replace(/\\/g, "/"),
                babelrc: false,
              },
            },
          ],
        },
      });

      const stats = await bundler.compileAsync(config);
      // Node supports ESM without a flag starting from 12.13.0 and 13.2.0.
      if (satisfies(process.version, `^12.13.0 || >=13.2.0`)) {
        assert.deepEqual(
          stats.compilation.errors.map(e => e.message),
          [],
        );
      } else {
        assert.strictEqual(stats.compilation.errors.length, 1);
        const moduleBuildError = stats.compilation.errors[0];
        const babelLoaderError = moduleBuildError.error;
        assert.ok(babelLoaderError instanceof Error);
        // Error messages are slightly different between versions:
        // "modules aren't supported" or "modules not supported".
        assert.match(babelLoaderError.message, /supported/i);
      }
      assert.equal(stats.compilation.warnings.length, 0);
    });

    test("should track external dependencies", async () => {
      const dep = path.join(__dirname, "fixtures/metadata.js");
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
                plugins: [
                  api => {
                    api.cache.never();
                    api.addExternalDependency(dep);
                    return { visitor: {} };
                  },
                ],
              },
            },
          ],
        },
      });

      const stats = await bundler.compileAsync(config);
      assert.ok(stats.compilation.fileDependencies.has(dep));
      assert.equal(stats.compilation.warnings.length, 0);
    });
    test("should output debug logs when stats.loggingDebug includes babel-loader", async () => {
      const config = Object.assign({}, globalConfig, {
        output: {
          path: context.directory,
        },
        stats: {
          loggingDebug: ["babel-loader"],
        },
      });

      const stats = await bundler.compileAsync(config);
      assert.match(
        stats.toString(config.stats),
        /normalizing loader options\n\s+resolving Babel configs\n\s+cache is disabled, applying Babel transform/,
      );
    });
  });
}
