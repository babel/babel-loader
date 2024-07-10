import test from "ava";
import path from "path";
import fs from "fs";
import createTestDirectory from "./helpers/createTestDirectory.js";
import { webpackAsync } from "./helpers/webpackAsync.js";
import { NormalModule } from "webpack";

const cacheDir = path.join(__dirname, "output/cache/cachefiles");
const outputDir = path.join(__dirname, "output/metadata");
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

class WebpackMetadataSubscriberPlugin {
  static subscriber = Symbol("subscriber");
  constructor(subscriberCallback) {
    this.subscriberCallback = subscriberCallback;
  }
  apply(compiler) {
    compiler.hooks.compilation.tap("plugin", compilation => {
      NormalModule.getCompilationHooks(compilation).loader.tap(
        "plugin",
        context => {
          context[WebpackMetadataSubscriberPlugin.subscriber] =
            this.subscriberCallback;
        },
      );
    });
  }
}

// Create a separate directory for each test so that the tests
// can run in parallel
test.beforeEach(async t => {
  const directory = await createTestDirectory(outputDir, t.title);
  t.context.directory = directory;
});

test.afterEach(t =>
  fs.rmSync(t.context.directory, { recursive: true, force: true }),
);

test("should obtain metadata from the transform result", async t => {
  let actualMetadata;

  const config = {
    mode: "development",
    entry: "./test/fixtures/basic.js",
    output: {
      path: t.context.directory,
      filename: "[id].metadata.js",
    },
    plugins: [
      new WebpackMetadataSubscriberPlugin(
        metadata => (actualMetadata = metadata),
      ),
    ],
    module: {
      rules: [
        {
          test: /\.js/,
          loader: babelLoader,
          options: {
            metadataSubscribers: [WebpackMetadataSubscriberPlugin.subscriber],
            plugins: [babelMetadataProvierPlugin],
            babelrc: false,
            configFile: false,
          },
          exclude: /node_modules/,
        },
      ],
    },
  };

  const stats = await webpackAsync(config);
  t.deepEqual(stats.compilation.errors, []);
  t.deepEqual(stats.compilation.warnings, []);

  t.deepEqual(actualMetadata, { hello: "world" });
});

test("should obtain metadata from the transform result with cache", async t => {
  let actualMetadata;

  const config = {
    mode: "development",
    entry: "./test/fixtures/basic.js",
    output: {
      path: t.context.directory,
      filename: "[id].metadata.js",
    },
    plugins: [
      new WebpackMetadataSubscriberPlugin(
        metadata => (actualMetadata = metadata),
      ),
    ],
    module: {
      rules: [
        {
          test: /\.js/,
          loader: babelLoader,
          options: {
            cacheDirectory: cacheDir,
            metadataSubscribers: [WebpackMetadataSubscriberPlugin.subscriber],
            plugins: [babelMetadataProvierPlugin],
            babelrc: false,
            configFile: false,
          },
          exclude: /node_modules/,
        },
      ],
    },
  };

  const stats = await webpackAsync(config);
  t.deepEqual(stats.compilation.errors, []);
  t.deepEqual(stats.compilation.warnings, []);

  t.deepEqual(actualMetadata, { hello: "world" });
});
