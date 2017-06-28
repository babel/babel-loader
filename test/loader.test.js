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
    entry: path.join(__dirname, "fixtures/basic.js"),
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          exclude: /node_modules/,
          query: {
            presets,
          },
        },
      ],
    },
  };

  if (!context) {
    return globalConfig;
  }

  return Object.assign({}, globalConfig, {
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
  const config = generateConfigWithPresets(["env"], t.context);

  webpack(config, err => {
    t.is(err, null);

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
  const globalConfig = generateConfigWithPresets(["env"], t.context);
  const config = Object.assign({}, globalConfig, {
    entry: path.join(__dirname, "fixtures/syntax.js"),
  });

  webpack(config, (err, stats) => {
    t.true(stats.compilation.errors.length === 1);
    t.true(stats.compilation.errors[0] instanceof Error);

    t.end();
  });
});

test.cb("should use correct env", t => {
  const config = {
    entry: path.join(__dirname, "fixtures/basic.js"),
    output: {
      path: t.context.directory,
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          query: {
            forceEnv: "testenv",
            env: {
              testenv: {
                presets: ["es2015abc"],
              },
              otherenv: {
                presets: ["es2015xyz"],
              },
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
  };

  webpack(config, (err, stats) => {
    t.is(err, null);

    t.true(stats.compilation.errors.length === 1);

    t.truthy(stats.compilation.errors[0].message.match(/es2015abc/));
    t.falsy(stats.compilation.errors[0].message.match(/es2015xyz/));

    t.end();
  });
});

test.serial.cb("should not polute BABEL_ENV after using forceEnv", t => {
  const initialBabelEnv = process.env.BABEL_ENV;

  const config = {
    entry: path.join(__dirname, "fixtures/basic.js"),
    output: {
      path: t.context.directory,
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          query: {
            forceEnv: "testenv",
            env: {
              testenv: {
                presets: ["es2015"],
              },
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
  };

  webpack(config, () => {
    t.truthy(process.env.BABEL_ENV === initialBabelEnv);
    t.end();
  });
});

test.serial.cb(
  "should not polute BABEL_ENV after using forceEnv (on exception)",
  t => {
    const initialBabelEnv = process.env.BABEL_ENV;

    const config = {
      entry: path.join(__dirname, "fixtures/basic.js"),
      output: {
        path: t.context.directory,
      },
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            query: {
              forceEnv: "testenv",
              env: {
                testenv: {
                  presets: ["es2015asd"],
                },
              },
            },
            exclude: /node_modules/,
          },
        ],
      },
    };

    webpack(config, () => {
      t.truthy(process.env.BABEL_ENV === initialBabelEnv);
      t.end();
    });
  },
);

test.serial.cb("should not change BABEL_ENV when using forceEnv", t => {
  const initialBabelEnv = process.env.BABEL_ENV;

  process.env.BABEL_ENV = "nontestenv";

  const config = {
    entry: path.join(__dirname, "fixtures/basic.js"),
    output: {
      path: t.context.directory,
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          query: {
            forceEnv: "testenv",
            env: {
              testenv: {
                presets: ["es2015abc"],
              },
              nontestenv: {
                presets: ["es2015xzy"],
              },
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
  };

  webpack(config, (err, stats) => {
    t.is(err, null);

    t.true(stats.compilation.errors.length === 1);

    t.truthy(stats.compilation.errors[0].message.match(/es2015abc/));
    t.falsy(stats.compilation.errors[0].message.match(/es2015xyz/));

    t.truthy("nontestenv" === process.env.BABEL_ENV);

    if (initialBabelEnv !== undefined) {
      process.env.BABEL_ENV = initialBabelEnv;
    } else {
      delete process.env.BABEL_ENV;
    }

    t.end();
  });
});

test.cb("should not throw without config", t => {
  const config = {
    entry: path.join(__dirname, "fixtures/basic.js"),
    output: {
      path: t.context.directory,
    },
    module: {
      loaders: [
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

    t.true(stats.compilation.errors.length === 0);

    t.end();
  });
});

test.cb("should not throw a warning when modules is set to false", t => {
  const configs = [
    generateConfigWithPresets([["env", { modules: false }]], t.context),
    generateConfigWithPresets([["es2015", { modules: false }]], t.context),
    generateConfigWithPresets([["latest", { modules: false }]], t.context),
    generateConfigWithPresets([["es2015abc"]], t.context),
  ];

  webpack(configs, (err, stats) => {
    t.is(err, null);

    stats.stats.forEach(stat => {
      const warnings = stat.compilation.warnings;
      t.true(warnings.length === 0);
    });

    t.end();
  });
});

test.cb("should throw a warning when modules is not set to false", t => {
  const configs = [
    generateConfigWithPresets(["env"], t.context),
    generateConfigWithPresets([["env", { modules: "umd" }]], t.context),
    generateConfigWithPresets([["env", { modules: "amd" }]], t.context),
    generateConfigWithPresets([["env", { modules: "commonjs" }]], t.context),
    generateConfigWithPresets(["es2015"], t.context),
    generateConfigWithPresets([["es2015", { modules: "umd" }]], t.context),
    generateConfigWithPresets([["es2015", { modules: "amd" }]], t.context),
    generateConfigWithPresets([["es2015", { modules: "commonjs" }]], t.context),
    generateConfigWithPresets(["latest"], t.context),
    generateConfigWithPresets([["latest", { modules: "umd" }]], t.context),
    generateConfigWithPresets([["latest", { modules: "amd" }]], t.context),
    generateConfigWithPresets([["latest", { modules: "commonjs" }]], t.context),
  ];

  webpack(configs, (err, stats) => {
    t.is(err, null);

    stats.stats.forEach((stat, index) => {
      let presetName = configs[index].module.loaders[0].query.presets[0];
      if (typeof presetName !== "string") {
        presetName = presetName[0];
      }

      const warnings = stat.compilation.warnings;
      t.true(warnings.length === 1);
      if (warnings.length) {
        t.is(
          warnings[0].message,
          `\n\n⚠️  Babel Loader\n
It looks like your Babel configuration specifies a module transformer. Please disable it.
See https://babeljs.io/docs/plugins/preset-${presetName}/#optionsmodules for more information.`,
        );
      }
    });

    t.end();
  });
});
