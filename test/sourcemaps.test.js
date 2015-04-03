var fs = require('fs'),
    path = require('path'),
    assign = require('object-assign'),
    expect = require('expect.js'),
    mkdirp = require('mkdirp'),
    rimraf = require('rimraf'),
    webpack = require('webpack');

describe('Sourcemaps', function () {

    var outputDir = path.resolve(__dirname, './output/sourcemaps'),
        babelLoader = path.resolve(__dirname, '../'),

        globalConfig = {
            entry: './test/fixtures/basic.js',
            output: {
                path: outputDir,
                filename: '[id].options.js'
            },
            module: {
                loaders: [
                    {
                        test: /\.jsx?/,
                        loader: babelLoader,
                        exclude: /node_modules/
                    }
                ]
            }
        };

    // Clean generated cache files before each test
    // so that we can call each test with an empty state.
    beforeEach(function (done) {
        rimraf(outputDir, function (err) {
            if (err) { return done(err); }
            mkdirp(outputDir, done);
        });
    });

    it('should output webpack\'s sourcemap', function (done) {

        var config = assign({}, globalConfig, {
            devtool: 'source-map',
            entry: './test/fixtures/basic.js',
            module: {
                loaders: [{
                    test: /\.jsx?/,
                    loader: babelLoader,
                    exclude: /node_modules/
                }]
            }
        });

        webpack(config, function (err, stats) {
            expect(err).to.be(null);

            fs.readdir(outputDir, function (err, files) {
                expect(err).to.be(null);

                var map = files.filter(function (file) {
                    return (file.indexOf('.map') !== -1);
                });

                expect(map).to.not.be.empty();

                fs.readFile(path.resolve(outputDir, map[0]), function (err, data) {
                    expect(err).to.be(null);
                    expect(data.toString().indexOf('webpack:///')).to.not.equal(-1);
                    done();
                });

            });
        });
    });

    it.skip('should output babel\'s sourcemap', function (done) {

        var config = assign({}, globalConfig, {
            entry: './test/fixtures/basic.js',
            babel: {
                sourceMap: true,
                sourceMapName: './output/sourcemaps/babel.map'
            },
            module: {
                loaders: [{
                    test: /\.jsx?/,
                    loader: babelLoader,
                    exclude: /node_modules/
                }]
            }
        });

        webpack(config, function (err, stats) {
            expect(err).to.be(null);

            fs.readdir(outputDir, function (err, files) {
                expect(err).to.be(null);

                var map = files.filter(function (file) {
                    return (file.indexOf('.map') !== -1);
                });

                expect(map).to.not.be.empty();

                fs.readFile(path.resolve(outputDir, map[0]), function (err, data) {
                    expect(err).to.be(null);
                    expect(data.toString().indexOf('webpack:///')).to.equal(-1);
                    done();
                });

            });
        });
    });

});
