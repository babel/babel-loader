"use strict";

let fs = require("fs");
let path = require("path");
let assign = require("object-assign");
let mkdirp = require("mkdirp");
let rimraf = require("rimraf");
let webpack = require("webpack");

describe("Loader", function() {
  let outputDir = path.resolve(__dirname, "./output/loader");
  let babelLoader = path.resolve(__dirname, "../");
  let globalConfig = {
    entry: "./test/fixtures/basic.js",
    output: {
      path: outputDir,
      filename: "[id].loader.js",
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          query: {
            presets: ["es2015"],
          },
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

  it("should transpile the code snippet", function(done) {
    let config = assign({}, globalConfig, {
      entry: "./test/fixtures/basic.js",
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            query: {
              presets: ["es2015"],
            },
            exclude: /node_modules/,
          },
        ],
      },
    });

    webpack(config, function(err) {
      expect(err).toBeNull();

      fs.readdir(outputDir, function(err, files) {
        expect(err).toBeNull();
        expect(files.length).toBe(1);
        fs.readFile(path.resolve(outputDir, files[0]), function(err, data) {
          let test = "var App = function App()";
          let subject = data.toString();

          expect(err).toBeNull();
          expect(subject.indexOf(test)).not.toBe(-1);

          return done();
        });
      });
    });
  });

  it("should not throw error on syntax error", function(done) {
    let config = assign({}, globalConfig, {
      entry: "./test/fixtures/syntax.js",
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            query: {
              presets: ["es2015"],
            },
            exclude: /node_modules/,
          },
        ],
      },
    });

    webpack(config, function(err, stats) {
      expect(stats.compilation.errors.length).toBe(1);
      expect(stats.compilation.errors[0]).toBeInstanceOf(Error);

      return done();
    });

  });

});
