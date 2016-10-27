"use strict";

let fs = require("fs");
let path = require("path");
let assign = require("object-assign");
let expect = require("expect.js");
let mkdirp = require("mkdirp");
let rimraf = require("rimraf");
let webpack = require("webpack");

describe("Filesystem Cache", function() {
  this.timeout(15000);

  let defaultCacheDir = path.resolve(__dirname,
    "../node_modules/.cache/babel-loader");
  let cacheDir = path.resolve(__dirname, "output/cache/cachefiles");
  let outputDir = path.resolve(__dirname, "./output/cache/");
  let babelLoader = path.resolve(__dirname, "../");

  console.log("babelLoader", babelLoader);

  let globalConfig = {
    entry: "./test/fixtures/basic.js",
    output: {
      path: outputDir,
      filename: "[id].cache.js",
    },
    module: {
      loaders: [
        {
          test: /\.js$/,
          loader: babelLoader,
          exclude: /node_modules/,
        },
      ],
    },
  };

  // Clean generated cache files before each test
  // so that we can call each test with an empty state.
  beforeEach(function(done) {
    rimraf(outputDir, function(err) {
      if (err) { return done(err); }
      mkdirp(cacheDir, done);
    });
  });
  beforeEach(function(done) {
    rimraf(defaultCacheDir, done);
  });

  it("should output files to cache directory", function(done) {

    let config = assign({}, globalConfig, {
      module: {
        loaders: [
          {
            test: /\.js$/,
            loader: babelLoader,
            exclude: /node_modules/,
            query: {
              cacheDirectory: cacheDir,
              presets: ["es2015"],
            },
          },
        ],
      },
    });

    webpack(config, function(err) {
      expect(err).to.be(null);

      fs.readdir(cacheDir, function(err, files) {
        expect(err).to.be(null);
        expect(files).to.not.be.empty();
        done();
      });
    });
  });

  it("should output files to standard cache dir by default", function(done) {
    let config = assign({}, globalConfig, {
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            query: {
              cacheDirectory: true,
              presets: ["es2015"],
            },
          },
        ],
      },
    });

    webpack(config, function(err) {
      expect(err).to.be(null);

      fs.readdir(defaultCacheDir, function(err, files) {
        files = files.filter(function(file) {
          return /\b[0-9a-f]{5,40}\.json\.gzip\b/.test(file);
        });

        expect(err).to.be(null);
        expect(files).to.not.be.empty();
        done();
      });
    });
  });

  it("should read from cache directory if cached file exists", function(done) {
    let loader = babelLoader;
    let config = assign({}, globalConfig, {
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: loader,
            exclude: /node_modules/,
            query: {
              cacheDirectory: cacheDir,
              presets: ["es2015"],
            },
          },
        ],
      },
    });

    // @TODO Find a way to know if the file as correctly read without relying on
    // Istanbul for coverage.
    webpack(config, function(err) {
      expect(err).to.be(null);

      webpack(config, function(err) {
        expect(err).to.be(null);
        fs.readdir(cacheDir, function(err, files) {
          expect(err).to.be(null);
          expect(files).to.not.be.empty();
          done();
        });
      });
    });

  });

  it("should have one file per module", function(done) {
    let loader = babelLoader;
    let config = assign({}, globalConfig, {
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: loader,
            exclude: /node_modules/,
            query: {
              cacheDirectory: cacheDir,
              presets: ["es2015"],
            },
          },
        ],
      },
    });

    webpack(config, function(err) {
      expect(err).to.be(null);

      fs.readdir(cacheDir, function(err, files) {
        expect(err).to.be(null);
        expect(files).to.have.length(3);
        done();
      });
    });

  });


  it("should generate a new file if the identifier changes", function(done) {

    let configs = [
      assign({}, globalConfig, {
        module: {
          loaders: [
            {
              test: /\.jsx?/,
              loader: babelLoader,
              exclude: /node_modules/,
              query: {
                cacheDirectory: cacheDir,
                cacheIdentifier: "a",
                presets: ["es2015"],
              },
            },
          ],
        },
      }),
      assign({}, globalConfig, {
        module: {
          loaders: [
            {
              test: /\.jsx?/,
              loader: babelLoader,
              exclude: /node_modules/,
              query: {
                cacheDirectory: cacheDir,
                cacheIdentifier: "b",
                presets: ["es2015"],
              },
            },
          ],
        },
      }),
    ];
    let counter = configs.length;

    configs.forEach(function(config) {
      webpack(config, function(err) {
        expect(err).to.be(null);
        counter -= 1;

        if (!counter) {
          fs.readdir(cacheDir, function(err, files) {
            expect(err).to.be(null);
            expect(files).to.have.length(6);
            done();
          });
        }
      });
    });

  });

  it("should allow to specify the .babelrc file", function(done) {
    let config = [
      assign({}, globalConfig, {
        entry: "./test/fixtures/constant.js",
        module: {
          loaders: [
            {
              test: /\.jsx?/,
              loader: babelLoader,
              exclude: /node_modules/,
              query: {
                cacheDirectory: cacheDir,
                babelrc: path.resolve(__dirname, "fixtures/babelrc"),
                presets: ["es2015"],
              },
            },
          ],
        },
      }),
      assign({}, globalConfig, {
        entry: "./test/fixtures/constant.js",
        module: {
          loaders: [
            {
              test: /\.jsx?/,
              loader: babelLoader,
              exclude: /node_modules/,
              query: {
                cacheDirectory: cacheDir,
                presets: ["es2015"],
              },
            },
          ],
        },
      }),
    ];

    webpack(config, function(err) {
      expect(err).to.be(null);

      fs.readdir(cacheDir, function(err, files) {
        expect(err).to.be(null);
        expect(files).to.have.length(2);
        done();
      });
    });
  });
});
