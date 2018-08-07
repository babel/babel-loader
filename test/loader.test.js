import test from "ava";
import fs from "fs";
import path from "path";
import rimraf from "rimraf";
import webpack from "webpack";
import createTestDirectory from "./helpers/createTestDirectory";

const outputDir = path.join(__dirname, "output/loader");
const babelLoader = path.join(__dirname, "../lib");

const generateConfigWithPresets = (presets, context = false) => {
  const globalConfig = {
    mode: "development",
    entry: path.join(__dirname, "fixtures/basic.js"),
    module: {
      rules: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          options: {
            presets,
          },
          exclude: /node_modules/,
        },
      ],
    },
  };

  if (!context) {
    return globalConfig;
  }

  return Object.assign(globalConfig, {
    output: {
      path: context.directory,
    },
  });
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

test.cb.afterEach(t => rimraf(t.context.directory, t.end));

test.cb("should transpile the code snippet", t => {
  const config = generateConfigWithPresets(["@babel/env"], t.context);

  webpack(config, (err, stats) => {
    t.is(err, null);
    t.is(stats.compilation.errors.length, 0);
    t.is(stats.compilation.warnings.length, 0);

    fs.readdir(t.context.directory, (err, files) => {
      t.is(err, null);
      t.true(files.length === 1);
      fs.readFile(path.resolve(t.context.directory, files[0]), (err, data) => {
        t.is(err, null);
        const test = "var App = function App()";
        const subject = data.toString();

        t.not(subject.indexOf(test), -1);

        t.end();
      });
    });
  });
});

test.cb("should not throw error on syntax error", t => {
  const globalConfig = generateConfigWithPresets(["@babel/env"], t.context);
  const config = Object.assign({}, globalConfig, {
    entry: path.join(__dirname, "fixtures/syntax.js"),
    output: {
      path: t.context.directory,
    },
  });

  webpack(config, (err, stats) => {
    t.true(stats.compilation.errors.length === 1);
    t.true(stats.compilation.errors[0] instanceof Error);
    t.is(stats.compilation.warnings.length, 0);

    t.end();
  });
});

test.cb("should not throw without config", t => {
  const config = {
    mode: "development",
    entry: path.join(__dirname, "fixtures/basic.js"),
    output: {
      path: t.context.directory,
    },
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

  webpack(config, (err, stats) => {
    t.is(err, null);
    t.is(stats.compilation.errors.length, 0);
    t.is(stats.compilation.warnings.length, 0);

    t.end();
  });
});

test.cb(
  "should return compilation errors with the message included in the stack trace",
  t => {
    const globalConfig = generateConfigWithPresets(["@babel/env"], t.context);
    const config = Object.assign({}, globalConfig, {
      entry: path.join(__dirname, "fixtures/syntax.js"),
      output: {
        path: t.context.directory,
      },
    });
    webpack(config, (err, stats) => {
      t.is(err, null);
      t.is(stats.compilation.warnings.length, 0);
      const moduleBuildError = stats.compilation.errors[0];
      const babelLoaderError = moduleBuildError.error;
      t.regex(babelLoaderError.stack, /Unexpected character/);
      t.end();
    });
  },
);

test.cb("should not disable modules option when it is explicitly set", t => {
  const configs = [
    generateConfigWithPresets([["env", { modules: true }]], t.context),
    generateConfigWithPresets([["env", { modules: "amd" }]], t.context),
  ];

  const callback = err => {
    t.is(err, null);
    multiCompiler.compilers.forEach(compiler => {
      t.truthy(compiler.options.module.rules[0].options.presets[0][1].modules);
    });
    t.end();
  };
  const multiCompiler = webpack(configs, callback);
});

test.cb("should disable modules option when it is not set", t => {
  const configs = [
    generateConfigWithPresets([["env"]], t.context),
    generateConfigWithPresets(["env"], t.context),
    generateConfigWithPresets([["env", { modules: false }]], t.context),
    generateConfigWithPresets([["@babel/preset-env"]], t.context),
    generateConfigWithPresets([["babel-preset-env"]], t.context),
  ];

  const callback = err => {
    t.is(err, null);
    multiCompiler.compilers.forEach(compiler => {
      t.false(compiler.options.module.rules[0].options.presets[0][1].modules);
    });
    t.end();
  };
  const multiCompiler = webpack(configs, callback);
});
