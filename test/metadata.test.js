import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import createTestDirectory from "./helpers/createTestDirectory.js";
import { bundlers } from "./helpers/bundlers.js";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.join(__dirname, "output/cache/cachefiles");
const babelLoader = path.join(__dirname, "../lib");

function babelMetadataProvierPlugin() {
  return {
    name: "babel-metadata-provider-plugin",
    visitor: {
      Program(_, pass) {
        pass.file.metadata = { hello: "world" };
      },
    },
  };
}

class MetadataSubscriberPlugin {
  static subscriber = Symbol("subscriber");
  constructor(subscriberCallback) {
    this.subscriberCallback = subscriberCallback;
  }
  apply(compiler) {
    compiler.hooks.compilation.tap("plugin", compilation => {
      compiler.webpack.NormalModule.getCompilationHooks(compilation).loader.tap(
        "plugin",
        context => {
          context[MetadataSubscriberPlugin.subscriber] =
            this.subscriberCallback;
        },
      );
    });
  }
}

for (const bundler of bundlers) {
  test.describe(bundler.name, () => {
    const outputDir = path.join(__dirname, "output/metadata", bundler.name);

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

    test("should obtain metadata from the transform result", async () => {
      let actualMetadata;

      const config = {
        mode: "development",
        entry: "./test/fixtures/basic.js",
        output: {
          path: context.directory,
          filename: "[id].metadata.js",
        },
        plugins: [
          new MetadataSubscriberPlugin(metadata => (actualMetadata = metadata)),
        ],
        module: {
          rules: [
            {
              test: /\.js/,
              loader: babelLoader,
              options: {
                metadataSubscribers: [MetadataSubscriberPlugin.subscriber],
                plugins: [babelMetadataProvierPlugin],
                babelrc: false,
                configFile: false,
              },
              exclude: /node_modules/,
            },
          ],
        },
      };

      const stats = await bundler.compileAsync(config);
      assert.equal(stats.compilation.errors.length, 0);
      assert.equal(stats.compilation.warnings.length, 0);

      assert.deepEqual(actualMetadata, { hello: "world" });
    });

    test("should obtain metadata from the transform result with cache", async () => {
      let actualMetadata;

      const config = {
        mode: "development",
        entry: "./test/fixtures/basic.js",
        output: {
          path: context.directory,
          filename: "[id].metadata.js",
        },
        plugins: [
          new MetadataSubscriberPlugin(metadata => (actualMetadata = metadata)),
        ],
        module: {
          rules: [
            {
              test: /\.js/,
              loader: babelLoader,
              options: {
                cacheDirectory: cacheDir,
                metadataSubscribers: [MetadataSubscriberPlugin.subscriber],
                plugins: [babelMetadataProvierPlugin],
                babelrc: false,
                configFile: false,
              },
              exclude: /node_modules/,
            },
          ],
        },
      };

      const stats = await bundler.compileAsync(config);
      assert.equal(stats.compilation.errors.length, 0);
      assert.equal(stats.compilation.warnings.length, 0);

      assert.deepEqual(actualMetadata, { hello: "world" });
    });
  });
}
