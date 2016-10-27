"use strict";

let fs = require("fs");
let path = require("path");
let assign = require("object-assign");
let mkdirp = require("mkdirp");
let rimraf = require("rimraf");
let webpack = require("webpack");

describe("Options", function() {

  let outputDir = path.resolve(__dirname, "./output/options");
  let babelLoader = path.resolve(__dirname, "../");
  let globalConfig = {
    entry: "./test/fixtures/basic.js",
    output: {
      path: outputDir,
      filename: "[id].options.js",
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

  // Clean generated cache files before each test
  // so that we can call each test with an empty state.
  beforeEach(function(done) {
    rimraf(outputDir, function(err) {
      if (err) { return done(err); }
      mkdirp(outputDir, done);
    });
  });

  it("should interpret options given to the loader", function(done) {
    let config = assign({}, globalConfig, {
      entry: "./test/fixtures/basic.js",
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: babelLoader + "?presets[]=es2015",
            exclude: /node_modules/,
          },
        ],
      },
    });

    webpack(config, function(err) {
      expect(err).toBeNull();

      fs.readdir(outputDir, function(err, files) {
        expect(err).toBeNull();
        expect(files.length).toBeGreaterThan(0)

        done();
      });
    });
  });

  it("should interpret options given globally", function(done) {

    let config = assign({}, globalConfig, {
      entry: "./test/fixtures/basic.js",
      babel: {
        presets: ["es2015"],
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
    });

    webpack(config, function(err) {
      expect(err).toBeNull();

      fs.readdir(outputDir, function(err, files) {
        expect(err).toBeNull();
        expect(files.length).toBeGreaterThan(0)

        done();
      });
    });
  });

  it("should give priority to loader options", function(done) {
    let config = assign({}, globalConfig, {
      entry: "./test/fixtures/basic.js",
      babel: {
        presets: [],
      },
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: babelLoader + "?presets[]=es2015",
            exclude: /node_modules/,
          },
        ],
      },
    });

    webpack(config, function(err) {
      expect(err).toBeNull();

      fs.readdir(outputDir, function(err, files) {
        expect(err).toBeNull();
        expect(files.length).toBeGreaterThan(0)

        done();
      });
    });
  });

});
