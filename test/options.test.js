'use strict';

const fs = require('fs');
const path = require('path');
const assign = require('object-assign');
const expect = require('expect.js');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const webpack = require('webpack');

describe('Options', function() {

  const outputDir = path.resolve(__dirname, './output/options');
  const babelLoader = path.resolve(__dirname, '../');
  const globalConfig = {
    entry: './test/fixtures/basic.js',
    output: {
      path: outputDir,
      filename: '[id].options.js',
    },
    module: {
      loaders: [{
        test: /\.jsx?/,
        loader: babelLoader,
        exclude: /node_modules/,
      }, ],
    },
  };

  // Clean generated cache files before each test
  // so that we can call each test with an empty state.
  beforeEach(function(done) {
    rimraf(outputDir, function(err) {
      if (err) {
        return done(err);
      }
      mkdirp(outputDir, done);
    });
  });

  it('should interpret options given to the loader', function(done) {
    const config = assign({}, globalConfig, {
      entry: './test/fixtures/basic.js',
      module: {
        loaders: [{
          test: /\.jsx?/,
          loader: babelLoader + '?presets[]=es2015',
          exclude: /node_modules/,
        }, ],
      },
    });

    webpack(config, function(err) {
      expect(err).to.be(null);

      fs.readdir(outputDir, function(err, files) {
        expect(err).to.be(null);
        expect(files).to.not.be.empty();

        done();
      });
    });
  });

  it('should interpret options given globally', function(done) {

    const config = assign({}, globalConfig, {
      entry: './test/fixtures/basic.js',
      babel: {
        presets: ['es2015'],
      },
      module: {
        loaders: [{
          test: /\.jsx?/,
          loader: babelLoader,
          exclude: /node_modules/,
        }, ],
      },
    });

    webpack(config, function(err) {
      expect(err).to.be(null);

      fs.readdir(outputDir, function(err, files) {
        expect(err).to.be(null);
        expect(files).to.not.be.empty();

        done();
      });
    });
  });

  it('should give priority to loader options', function(done) {
    const config = assign({}, globalConfig, {
      entry: './test/fixtures/basic.js',
      babel: {
        presets: [],
      },
      module: {
        loaders: [{
          test: /\.jsx?/,
          loader: babelLoader + '?presets[]=es2015',
          exclude: /node_modules/,
        }, ],
      },
    });

    webpack(config, function(err) {
      expect(err).to.be(null);

      fs.readdir(outputDir, function(err, files) {
        expect(err).to.be(null);
        expect(files).to.not.be.empty();

        done();
      });
    });
  });

});
