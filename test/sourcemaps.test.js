import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { bundlers } from "./helpers/bundlers.js";
import createTestDirectory from "./helpers/createTestDirectory.js";
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
        exclude: /node_modules/,
      },
    ],
  },
};

for (const bundler of bundlers) {
  test.describe(bundler.name, () => {
    const outputDir = path.join(__dirname, "output/sourcemaps", bundler.name);
    const sourceMapProtocols =
      bundler.name === "rspack" ? ["rspack://", "webpack://"] : ["webpack://"];

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

    test("should output sourcemap", async () => {
      const config = Object.assign({}, globalConfig, {
        devtool: "source-map",
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

      const stats = await bundler.compileAsync(config);
      assert.equal(stats.compilation.errors.length, 0);
      assert.equal(stats.compilation.warnings.length, 0);

      const files = fs.readdirSync(context.directory);

      const map = files.filter(file => file.includes(".map"));

      assert.ok(map.length > 0);

      const sourceMapContent = fs.readFileSync(
        path.resolve(context.directory, map[0]),
        "utf8",
      );
      assert.ok(
        sourceMapProtocols.some(protocol =>
          sourceMapContent.includes(protocol),
        ),
      );
    });

    test("should output sourcemap properly when set 'inline'", async () => {
      const config = Object.assign({}, globalConfig, {
        devtool: "source-map",
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
                sourceMap: "inline",
                presets: [["@babel/env", { modules: "commonjs" }]],
              },
            },
          ],
        },
      });

      const stats = await bundler.compileAsync(config);
      assert.equal(stats.compilation.errors.length, 0);
      assert.equal(stats.compilation.warnings.length, 0);

      const files = fs.readdirSync(context.directory);
      const map = files.filter(file => file.includes(".map"));

      assert.ok(map.length > 0);

      const data = fs.readFileSync(path.resolve(context.directory, map[0]));
      const mapObj = JSON.parse(data);

      const fixtureBasicIndex =
        sourceMapProtocols
          .map(protocol =>
            mapObj.sources.indexOf(
              `${protocol}babel-loader/./test/fixtures/basic.js`,
            ),
          )
          .find(index => index !== -1) ?? -1;
      // The index may vary across webpack versions
      assert.notStrictEqual(fixtureBasicIndex, -1);

      // Ensure that the map contains the original code, not the compiled src.
      assert.strictEqual(
        mapObj.sourcesContent[fixtureBasicIndex].includes("__esModule"),
        false,
      );
    });

    test("should output devtoolModuleFilename option", async () => {
      const config = Object.assign({}, globalConfig, {
        devtool: "source-map",
        output: {
          path: context.directory,
          devtoolModuleFilenameTemplate:
            "=!=!=!=[absolute-resource-path]=!=!=!=",
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

      const stats = await bundler.compileAsync(config);
      assert.equal(stats.compilation.errors.length, 0);
      assert.equal(stats.compilation.warnings.length, 0);

      const files = fs.readdirSync(context.directory);
      const map = files.filter(file => file.includes(".map"));

      assert.ok(map.length > 0);

      const sourceMapContent = fs.readFileSync(
        path.resolve(context.directory, map[0]),
        "utf8",
      );

      assert.match(
        sourceMapContent,
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
    });

    test("should disable sourcemap output with 'sourceMaps:false'", async () => {
      const config = Object.assign({}, globalConfig, {
        devtool: "source-map",
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
                sourceMaps: false,
                presets: [["@babel/env", { modules: "commonjs" }]],
              },
            },
          ],
        },
      });

      const stats = await bundler.compileAsync(config);
      assert.equal(stats.compilation.errors.length, 0);
      assert.equal(stats.compilation.warnings.length, 0);

      const files = fs.readdirSync(context.directory);
      const map = files.filter(file => file.includes(".map"));

      assert.ok(map.length > 0);

      const data = fs.readFileSync(path.resolve(context.directory, map[0]));
      const mapObj = JSON.parse(data);

      const fixtureBasicIndex =
        sourceMapProtocols
          .map(protocol =>
            mapObj.sources.indexOf(
              `${protocol}babel-loader/./test/fixtures/basic.js`,
            ),
          )
          .find(index => index !== -1) ?? -1;
      // The index may vary across webpack versions
      assert.notStrictEqual(fixtureBasicIndex, -1);

      // Ensure that the code contains Babel's compiled output, because
      // sourcemaps from Babel are disabled.
      assert.ok(
        mapObj.sourcesContent[fixtureBasicIndex].includes("__esModule"),
      );
    });

    test("should disable sourcemap output with 'sourceMap:false'", async () => {
      const config = Object.assign({}, globalConfig, {
        devtool: "source-map",
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
                sourceMap: false,
                presets: [["@babel/env", { modules: "commonjs" }]],
              },
            },
          ],
        },
      });

      const stats = await bundler.compileAsync(config);
      assert.equal(stats.compilation.errors.length, 0);
      assert.equal(stats.compilation.warnings.length, 0);

      const files = fs.readdirSync(context.directory);
      const map = files.filter(file => file.includes(".map"));

      assert.ok(map.length > 0);

      const data = fs.readFileSync(path.resolve(context.directory, map[0]));
      const mapObj = JSON.parse(data);

      const fixtureBasicIndex =
        sourceMapProtocols
          .map(protocol =>
            mapObj.sources.indexOf(
              `${protocol}babel-loader/./test/fixtures/basic.js`,
            ),
          )
          .find(index => index !== -1) ?? -1;
      // The index may vary across webpack versions
      assert.notStrictEqual(fixtureBasicIndex, -1);

      // Ensure that the code contains Babel's compiled output, because
      // sourcemaps from Babel are disabled.
      assert.ok(
        mapObj.sourcesContent[fixtureBasicIndex].includes("__esModule"),
      );
    });
  });
}
