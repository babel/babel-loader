import test from "ava";
import fs from "fs";
import path from "path";
import { rimraf } from "rimraf";
import { webpackAsync } from "./helpers/webpackAsync.js";
import createTestDirectory from "./helpers/createTestDirectory.js";
import isWebpack5 from "./helpers/isWebpack5.js";

const outputDir = path.join(__dirname, "output/sourcemaps");
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

// Create a separate directory for each test so that the tests
// can run in parallel
test.beforeEach(async t => {
  const directory = await createTestDirectory(outputDir, t.title);
  t.context.directory = directory;
});

test.afterEach(t => rimraf(t.context.directory));

test("should output webpack's sourcemap", async t => {
  const config = Object.assign({}, globalConfig, {
    devtool: "source-map",
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
            presets: ["@babel/env"],
          },
        },
      ],
    },
  });

  const stats = await webpackAsync(config);
  t.deepEqual(stats.compilation.errors, []);
  t.deepEqual(stats.compilation.warnings, []);

  const files = fs.readdirSync(t.context.directory);

  const map = files.filter(file => file.includes(".map"));

  t.true(map.length > 0);

  const sourceMapContent = fs.readFileSync(
    path.resolve(t.context.directory, map[0]),
    "utf8",
  );
  t.truthy(
    sourceMapContent.includes(isWebpack5 ? "webpack://" : "webpack:///"),
  );
});

test("should output webpack's sourcemap properly when set 'inline'", async t => {
  const config = Object.assign({}, globalConfig, {
    devtool: "source-map",
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
            sourceMap: "inline",
            presets: [["@babel/env", { modules: "commonjs" }]],
          },
        },
      ],
    },
  });

  const stats = await webpackAsync(config);
  t.deepEqual(stats.compilation.errors, []);
  t.deepEqual(stats.compilation.warnings, []);

  const files = fs.readdirSync(t.context.directory);
  const map = files.filter(file => file.includes(".map"));

  t.true(map.length > 0);

  const data = fs.readFileSync(path.resolve(t.context.directory, map[0]));
  const mapObj = JSON.parse(data);

  if (isWebpack5) {
    t.is(mapObj.sources[3], "webpack://babel-loader/./test/fixtures/basic.js");

    // Ensure that the map contains the original code, not the compiled src.
    t.falsy(mapObj.sourcesContent[3].includes("__esModule"));
  } else {
    t.is(mapObj.sources[1], "webpack:///./test/fixtures/basic.js");

    // Ensure that the map contains the original code, not the compiled src.
    t.falsy(mapObj.sourcesContent[1].includes("__esModule"));
  }
});

test("should output webpack's devtoolModuleFilename option", async t => {
  const config = Object.assign({}, globalConfig, {
    devtool: "source-map",
    output: {
      path: t.context.directory,
      devtoolModuleFilenameTemplate: "=!=!=!=[absolute-resource-path]=!=!=!=",
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
  t.deepEqual(stats.compilation.errors, []);
  t.deepEqual(stats.compilation.warnings, []);

  const files = fs.readdirSync(t.context.directory);
  const map = files.filter(file => file.includes(".map"));

  t.true(map.length > 0);

  const sourceMapContent = fs.readFileSync(
    path.resolve(t.context.directory, map[0]),
    "utf8",
  );

  t.regex(
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

test("should disable sourcemap output with 'sourceMaps:false'", async t => {
  const config = Object.assign({}, globalConfig, {
    devtool: "source-map",
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
            sourceMaps: false,
            presets: [["@babel/env", { modules: "commonjs" }]],
          },
        },
      ],
    },
  });

  const stats = await webpackAsync(config);
  t.deepEqual(stats.compilation.errors, []);
  t.deepEqual(stats.compilation.warnings, []);

  const files = fs.readdirSync(t.context.directory);
  const map = files.filter(file => file.includes(".map"));

  t.true(map.length > 0);

  const data = fs.readFileSync(path.resolve(t.context.directory, map[0]));
  const mapObj = JSON.parse(data);

  if (isWebpack5) {
    t.is(mapObj.sources[3], "webpack://babel-loader/./test/fixtures/basic.js");

    // Ensure that the code contains Babel's compiled output, because
    // sourcemaps from Babel are disabled.
    t.truthy(mapObj.sourcesContent[3].includes("__esModule"));
  } else {
    t.is(mapObj.sources[1], "webpack:///./test/fixtures/basic.js");

    // Ensure that the code contains Babel's compiled output, because
    // sourcemaps from Babel are disabled.
    t.truthy(mapObj.sourcesContent[1].includes("__esModule"));
  }
});

test("should disable sourcemap output with 'sourceMap:false'", async t => {
  const config = Object.assign({}, globalConfig, {
    devtool: "source-map",
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
            sourceMap: false,
            presets: [["@babel/env", { modules: "commonjs" }]],
          },
        },
      ],
    },
  });

  const stats = await webpackAsync(config);
  t.deepEqual(stats.compilation.errors, []);
  t.deepEqual(stats.compilation.warnings, []);

  const files = fs.readdirSync(t.context.directory);
  const map = files.filter(file => file.includes(".map"));

  t.true(map.length > 0);

  const data = fs.readFileSync(path.resolve(t.context.directory, map[0]));
  const mapObj = JSON.parse(data);

  if (isWebpack5) {
    t.is(mapObj.sources[3], "webpack://babel-loader/./test/fixtures/basic.js");

    // Ensure that the code contains Babel's compiled output, because
    // sourcemaps from Babel are disabled.
    t.truthy(mapObj.sourcesContent[3].includes("__esModule"));
  } else {
    t.is(mapObj.sources[1], "webpack:///./test/fixtures/basic.js");

    // Ensure that the code contains Babel's compiled output, because
    // sourcemaps from Babel are disabled.
    t.truthy(mapObj.sourcesContent[1].includes("__esModule"));
  }
});
