"use strict";

let fs = require("fs");
let path = require("path");
let assign = require("object-assign");
let expect = require("expect.js");
let mkdirp = require("mkdirp");
let rimraf = require("rimraf");
let webpack = require("webpack");

describe("Loader", function() {

  this.timeout(3000); // @TODO this is worrisome

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
      expect(err).to.be(null);

      fs.readdir(outputDir, function(err, files) {
        expect(err).to.be(null);
        expect(files.length).to.equal(1);
        fs.readFile(path.resolve(outputDir, files[0]), function(err, data) {
          let test = "var App = function App()";
          let subject = data.toString();

          expect(err).to.be(null);
          expect(subject.indexOf(test)).to.not.equal(-1);

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
      expect(stats.compilation.errors.length).to.be(1);
      expect(stats.compilation.errors[0]).to.be.an(Error);

      return done();
    });

  });

});
