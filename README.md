# babel-loader
  > Babel is a compiler for writing next generation JavaScript.

  This package allows the use babel with [webpack](https://github.com/webpack/webpack)

  __Notes:__ Issues with the output should be reported on the babel [issue tracker](https://github.com/babel/babel/issues);

## Installation

```bash
npm install babel-loader babel-core --save-dev
```

__Note:__ [npm](https://npmjs.com) will deprecate [peerDependencies](https://github.com/npm/npm/issues/6565) on the next major release, so required dependencies like babel-core and webpack will have to be installed manually.

## Usage
  Within your webpack configuration object, you'll need to add the babel-loader to the list of modules, like so:

  ```javascript
module: {
  loaders: [
    {
      test: /\.jsx?$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel'
    }
  ]
}
  ```

### Options

See the `babel` [options](http://babeljs.io/docs/usage/options/).

You can pass options to the loader by writting them as a [query string](https://github.com/webpack/loader-utils):

  ```javascript
module: {
  loaders: [
    {
      test: /\.jsx?$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel?optional[]=runtime&stage=0'
    }
  ]
}
  ```

  or in a less used format, you can set an object in the webpack config.

  ```javascript
babel: {
  optional: ['runtime'],
  stage: 0
},
module: {
  loaders: [
    {
      test: /\.jsx?$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel'
    }
  ]
}
  ```

  __Note:__ options given directly to the loader take precedence in relation to the *global* object.

  This loader also supports the following loader-specific option:

  * `cacheDirectory`: When set, the given directory will be used to cache the results of the loader. Future webpack builds will attempt to read from the cache to avoid needing to run the potentially expensive Babel recompilation process on each run. A value of `true` will cause the loader to use the default OS temporary file directory.

  * `cacheIdentifier`: When set, it will add the given identifier to the cached files. This can be used to force cache busting if the identifier changes. By default the identifier is made by using the babel-core's version and the babel-loader's version.


  __Note:__ The `sourceMap` option is ignored, instead sourceMaps are automatically enabled when webpack is configured to use them (via the `devtool` config option).

## Troubleshooting

### babel-loader is slow!

  Make sure you are transforming as few files as possible. Because you are probably
  matching `/\.js$/`, you might be transforming the `node_modules` folder or other unwanted
  source.

  See the `exclude` option in the `loaders` config as documented above.

### babel is injecting helpers into each file and bloating my code!

  babel uses very small helpers for common functions such as `_extend`. By default
  this will be added to every file that requires it.

  You can instead require the babel runtime as a separate module to avoid the duplication.

  The following configuration disables automatic per-file runtime injection in babel, instead
  requiring `babel-runtime` and making all helper references use it.

  See the [docs](https://babeljs.io/docs/usage/runtime) for more information.

  **NOTE:** You must run `npm install babel-runtime --save` to include this in your project.

```javascript
loaders: [
  // the optional 'runtime' transformer tells babel to require the runtime
  // instead of inlining it.
  {
    test: /\.jsx?$/,
    exclude: /(node_modules|bower_components)/,
    loader: 'babel-loader?optional[]=runtime'
  }
]
```
## [License](http://couto.mit-license.org/)
