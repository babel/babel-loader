'use strict';

var fs = require('fs');
var path = require('path');
var assign = require('object-assign');
var expect = require('expect.js');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var webpack = require('webpack');

var ReactIntlPlugin = require('react-intl-webpack-plugin');

describe('Metadata', function() {

  var outputDir = path.resolve(__dirname, './output/metadata');
  var babelLoader = path.resolve(__dirname, '../');
  var globalConfig = {
    entry: './test/fixtures/metadata.js',
    output: {
      path: outputDir,
      filename: '[id].metadata.js',
    },
    plugins: [new ReactIntlPlugin(),],
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          query: {
            metadataSubscribers: [ReactIntlPlugin.metadataContextFunctionName],
            plugins: [
              ['react-intl', {enforceDescriptions: false,},],
            ],
            presets: [],
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

  it('should pass metadata code snippet', function(done) {
    var config = assign({}, globalConfig, {
    });

    webpack(config, function(err, stats) {
      expect(err).to.be(null);

      fs.readdir(outputDir, function(err, files) {
        expect(err).to.be(null);
        fs.readFile(path.resolve(outputDir, 'reactIntlMessages.json'),
          function(err, data) {
            var text = data.toString();
            expect(err).to.be(null);
            // TODO expect(subject.indexOf(test)).to.not.equal(-1);
            var jsonText = JSON.parse(text);
            expect(jsonText.length).to.be(1);
            expect(jsonText[0].id).to.be('greetingId');
            expect(jsonText[0].defaultMessage).to.be('Hello World!');

            return done();
          });
      });
    });
  });

  it('should not throw error ', function(done) {
    var config = assign({}, globalConfig, {});

    webpack(config, function(err, stats) {
      expect(stats.compilation.errors.length).to.be(0);
      return done();
    });
  });

  it('should throw error ', function(done) {
    var config = assign({}, globalConfig, {
      entry: './test/fixtures/metadataErr.js',
    });

    webpack(config, function(err, stats) {
      expect(stats.compilation.errors.length).to.be.greaterThan(0);
      return done();
    });
  });


});


