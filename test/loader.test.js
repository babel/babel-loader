import test from "ava";
import fs from "fs";
import path from "path";
import rimraf from "rimraf";
import webpack from "webpack";
import createTestDirectory from "./helpers/createTestDirectory";

const outputDir = path.join(__dirname, "output/loader");
const babelLoader = path.join(__dirname, "../lib");
const globalConfig = {
  entry: path.join(__dirname, "fixtures/basic.js"),
  module: {
    loaders: [
      {
        test: /\.jsx?/,
        loader: babelLoader,
        query: {
          presets: ["@babel/preset-env"],
        },
        exclude: /node_modules/,
      },
    ],
  },
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
  const config = Object.assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
  });

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
  const config = Object.assign({}, globalConfig, {
    entry: path.join(__dirname, "fixtures/syntax.js"),
    output: {
      path: t.context.directory,
    },
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

test.cb(
  "should return compilation errors with the message included in the stack trace",
  t => {
    const config = Object.assign({}, globalConfig, {
      entry: path.join(__dirname, "fixtures/syntax.js"),
      output: {
        path: t.context.directory,
      },
    });
    webpack(config, (err, stats) => {
      const moduleBuildError = stats.compilation.errors[0];
      const babelLoaderError = moduleBuildError.error;
      t.regex(babelLoaderError.stack, /Unexpected character/);
      t.end();
    });
  },
);
