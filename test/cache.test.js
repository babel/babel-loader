var fs = require('fs'),
    path = require('path'),
    assign = require('object-assign'),
    expect = require('expect.js'),
    mkdirp = require('mkdirp'),
    rimraf = require('rimraf'),
    webpack = require('webpack');

describe('Filesystem Cache', function () {

    var cacheDir = path.resolve(__dirname, 'output/cache'),
        outputDir = path.resolve(__dirname, './output'),
        babelLoader = path.resolve(__dirname, '../'),

        globalConfig = {
            entry: './test/fixtures/basic.js',
            output: {
                path: outputDir,
                filename: '[id].cache.js'
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
            mkdirp(cacheDir, done);
        });
    });

    it('should output files to cache directory', function (done) {

        var config = assign({}, globalConfig, {
            module: {
                loaders: [{
                    test: /\.jsx?/,
                    loader: babelLoader + '?cacheDirectory=' + cacheDir,
                    exclude: /node_modules/
                }]
            }
        });

        webpack(config, function (err, stats) {
            expect(err).to.be(null);

            fs.readdir(cacheDir, function (err, files) {
                expect(err).to.be(null);
                expect(files).to.not.be.empty();
                done();
            });
        });
    });

    it('should have one file per module', function (done) {
        var config = assign({}, globalConfig, {
            module: {
                loaders: [{
                    test: /\.jsx?/,
                    loader: babelLoader + '?cacheDirectory=' + cacheDir,
                    exclude: /node_modules/
                }]
            }
        });

        webpack(config, function (err, stats) {
            expect(err).to.be(null);

            fs.readdir(cacheDir, function (err, files) {
                expect(err).to.be(null);
                expect(files).to.have.length(3);
                done();
            });
        });

    });


    it('should generate a new file if the identifier changes', function (done) {

        var configs = [
                assign({},globalConfig, {
                    module: {
                        loaders: [{
                            test: /\.jsx?/,
                            loader: babelLoader + '?cacheDirectory=' + cacheDir + '&cacheIdentifier=a',
                            exclude: /node_modules/
                        }]
                    }
                }),
                assign({},globalConfig, {
                    module: {
                        loaders: [{
                            test: /\.jsx?/,
                            loader: babelLoader + '?cacheDirectory=' + cacheDir + '&cacheIdentifier=b',
                            exclude: /node_modules/
                        }]
                    }
                }),
            ],
            counter = configs.length;

        configs.forEach(function (config) {
            webpack(config, function (err, stats) {
                expect(err).to.be(null);
                counter -= 1;

                if (!counter) {
                    fs.readdir(cacheDir, function (err, files) {
                        expect(err).to.be(null);
                        expect(files).to.have.length(6);
                        done();
                    });
                }
            });
        });

    });
});
