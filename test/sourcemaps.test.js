"use strict";

let fs = require("fs");
let path = require("path");
let assign = require("object-assign");
let mkdirp = require("mkdirp");
let rimraf = require("rimraf");
let webpack = require("webpack");

describe("Sourcemaps", function() {

  let outputDir = path.resolve(__dirname, "./output/sourcemaps");
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

  it("should output webpack's sourcemap", function(done) {

    let config = assign({}, globalConfig, {
      devtool: "source-map",
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

        let map = files.filter(function(file) {
          return (file.indexOf(".map") !== -1);
        });

        expect(map.length).toBeGreaterThan(0);

        fs.readFile(path.resolve(outputDir, map[0]), function(err, data) {
          expect(err).toBeNull();
          expect(data.toString().indexOf("webpack:///")).not.toBe(-1);
          done();
        });

      });
    });
  });

  it.skip("should output babel's sourcemap", function(done) {

    let config = assign({}, globalConfig, {
      entry: "./test/fixtures/basic.js",
      babel: {
        sourceMap: true,
        sourceMapName: "./output/sourcemaps/babel.map",
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

        let map = files.filter(function(file) {
          return (file.indexOf(".map") !== -1);
        });

        expect(map.length).toBeGreaterThan(0);

        fs.readFile(path.resolve(outputDir, map[0]), function(err, data) {
          expect(err).toBeNull();
          expect(data.toString().indexOf("webpack:///")).toBe(-1);
          done();
        });
      });
    });
  });

});
