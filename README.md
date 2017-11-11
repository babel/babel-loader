[![npm][npm]][npm-url]
[![node][node]][node-url]
[![deps][deps]][deps-url]
[![test][test]][test-url]
[![build][build]][build-url]
[![coverage][cover]][cover-url]
[![chat][chat]][chat-url]

<div align="center">
  <a href="https://github.com/babel/babel/">
    <img width="200" height="200" src="https://rawgit.com/babel/logo/master/babel.svg">
  </a>
  <a href="https://github.com/webpack/webpack">
    <img width="200" height="200" src="https://webpack.js.org/assets/icon-square-big.svg">
  </a>
  <h1>Babel Loader</h1>
  <p>
    This package allows transpiling JavaScript files using <a href="https://github.com/babel/babel">Babel</a> and <a href="https://github.com/webpack/webpack">webpack</a>
  </p>
</div>

> ℹ️ Issues with the output should be reported on the `babel` [issue tracker](https://github.com/babel/babel/issues).

> ⚠️ This README is for `babel-loader` v8.0.0 + Babel v7.0.0.

> Check the [7.x branch](https://github.com/babel/babel-loader/tree/7.x) for usage docs with `babel` v6.0.0

<h2 align="center">Install</h2>

```bash
npm i -D babel-loader@8.0.0-beta.0 @babel/core@next @babel/preset-env@next
```

<h2 align="center"><a href="https://webpack.js.org/loaders/">Usage</a></h2>

**webpack.config.js**
```js
module: {
  rules: [
    {
      test: /\.js$/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
          plugins: [
            require('@babel/plugin-syntax-dynamic-import'),
            require('@babel/plugin-transform-object-rest-spread')
          ]
        }
      },
      exclude: /(node_modules|bower_components)/
    }
  ]
}
```

<h2 align="center"><a href="https://babeljs.io/docs/usage/api/#options">Options</a></h2>

|Name|Type|Default|Description|
|:--:|:--:|:-----:|:----------|
|[**`presets`**](#presets)|`{Array}`|`[]`|Set `babel` presets|
|[**`plugins`**](#plugins)|`{Array}`|`[]`|Set `babel` plugins|
|[**`forceEnv`**](#forceenv)|`{String}`|`BABEL_ENV`|Handle `BABEL_ENV`|
|[**`cacheDirectory`**](#cachedirectory)|`{Boolean}`|`false`|Provide a cache directory where cache items should be stored|
|[**`cacheIdentifier`**](#cacheidentifier)|`{String}`|[``](#cacheidentifier)|Provide a cache identifier to identify your cached items|

### `presets`

**webpack.config.js**
```js
{
  loader: 'babel-loader',
  options: {
    presets: [ '@babel/preset-env' ]
  }
}
```

### `plugins`

**webpack.config.js**
```js
{
  loader: 'babel-loader',
  options: {
    plugins: [
      require('@babel/plugin-transform-object-rest-spread')
    ]
  }
}
```

This loader also supports the following **loader-specific** options

### `forceEnv`

Will resolve `BABEL_ENV` then `NODE_ENV`. Allow you to override `BABEL_ENV/NODE_ENV` at the loader level. Useful for isomorphic applications with different babel configuration for client and server.

**webpack.config.js**
```js
{
  loader: 'babel-loader',
  options: {
    forceEnv: true
  }
}
```

### `cacheDirectory`

When set, the given directory will be used to cache the results of the loader. Future `webpack` builds will attempt to read from the cache to avoid needing to run the potentially expensive `babel` recompilation process on each run. If set to `true` the loader will use the default cache directory in `node_modules/.cache/babel-loader` or fallback to the default OS temporary file directory if no `node_modules` folder could be found in any root directory.

**webpack.config.js**
```js
{
  loader: 'babel-loader',
  options: {
    cacheDirectory: true
  }
}
```

### `cacheIdentifier`

Default is a string composed by the babel-core's version, the babel-loader's version, the contents of .babelrc file if it exists and the value of the environment variable `BABEL_ENV` with a fallback to the `NODE_ENV` environment variable. This can be set to a custom value to force cache busting if the identifier changes.

**webpack.config.js**
```js
{
  loader: 'babel-loader',
  options: {
    cacheIdentifier: `${identifier}`
  }
}
```

### `sourceMap`

> ℹ️  The `sourceMap` option is ignored, instead source maps are automatically enabled when `webpack` is configured to use them (via the `devtool` config option).

**webpack.config.js**
```js
{
  devtool: 'sourcemap'
}
```

<h2 align="center">Troubleshooting</h2>

### `The loader is slow!`

Make sure you are transforming as few files as possible. Because you are probably
matching `/\.js$/`, you might be transforming the `node_modules` folder or other unwanted
source.

To exclude `node_modules`, see the `exclude` option in the `loaders` config as documented above.

You can also speed up babel-loader by as much as 2x by using the `cacheDirectory` option.
This will cache transformations to the filesystem.

### `The loader is injecting helpers into each file and is bloating my code!`

`babel` uses very small helpers for common functions such as `_extend`. By default
this will be added to every file that requires it.

You can instead require the `babel` runtime as a separate module to avoid the duplication.

The following configuration disables automatic per-file runtime injection in babel, instead
requiring `babel-plugin-transform-runtime` and making all helper references use it.

See the [docs](http://babeljs.io/docs/plugins/transform-runtime/) for more information.

ℹ️  You must run `npm i -D babel-plugin-transform-runtime` to include this in your project and `@babel/runtime` itself as a dependency with `npm i @babel/runtime --save`.

**webpack.config.js**
```js
// the 'transform-runtime' plugin tells babel to require the runtime
// instead of inlining it.
{
  test: /\.js$/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: ['@babel/preset-env'],
      plugins: ['@babel/transform-runtime']
    }
  },
  exclude: /(node_modules|bower_components)/
}
```

### `transform-runtime & custom polyfills (e.g for Promises)`

Since [babel-plugin-transform-runtime](https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-runtime) includes a polyfill that includes a custom [regenerator runtime](https://github.com/facebook/regenerator/blob/master/packages/regenerator-runtime/runtime.js) and [core.js](https://github.com/zloirock/core-js), the following usual shimming method using `webpack.ProvidePlugin` will **not** work

**webpack.config.js**
```js
plugins: [
  new webpack.ProvidePlugin({
    'Promise': 'bluebird'
  })
]
```

The following approach will **not** work either

```js
require('@babel/runtime/core-js/promise').default = require('bluebird');

var promise = new Promise;
```

which outputs to (using `runtime`)

```js
'use strict';

var _Promise = require('@babel/runtime/core-js/promise')['default'];

require('@babel/runtime/core-js/promise')['default'] = require('bluebird');

var promise = new _Promise();
```

The previous `Promise` library is referenced and used before it is overridden.

One approach is to have a "bootstrap" step in your application that would first override the default globals before your application.

```js
// bootstrap.js

require('@babel/runtime/core-js/promise').default = require('bluebird');

// ...

require('./app');
```

### `The node API for babel has been moved to @babel/core`

If you receive this message it means that you have the npm package `babel` installed and use the short notation of the loader in the `webpack` config (which is not valid anymore as of `webpack` v2.x).

```js
{
  test: /\.js$/,
  loader: 'babel'
}
```

`webpack` then tries to load the `babel` package instead of the `babel-loader`.

To fix this you should uninstall the npm package `babel` as it is deprecated in `babel` v6.0.0. (instead install `@babel/cli` or `@babel/core`)
In the case one of your dependencies is installing `babel` and you cannot uninstall it yourself, use the complete name of the loader in the `webpack` config.

```js
{
  test: /\.js$/,
  loader: 'babel-loader'
}
```


[npm]: https://img.shields.io/npm/v/babel-loader.svg
[npm-url]: https://npmjs.com/package/babel-loader

[node]: https://img.shields.io/node/v/babel-loader.svg
[node-url]: https://nodejs.org

[deps]: https://david-dm.org/babel/cache-loader.svg
[deps-url]: https://david-dm.org/babel/cache-loader

[test]: http://img.shields.io/travis/babel/babel-loader.svg
[test-url]: https://travis-ci.org/babel/babel-loader

[build]: https://ci.appveyor.com/api/projects/status/vgtpr2i5bykgyuqo/branch/master?svg=true
[build-url]: https://ci.appveyor.com/project/danez/babel-loader/branch/master

[cover]: https://codecov.io/gh/babel/babel-loader/branch/master/graph/badge.svg
[cover-url]: https://codecov.io/gh/babel/babel-loader

[chat]: https://img.shields.io/badge/gitter-webpack%2Fwebpack-brightgreen.svg
[chat-url]: https://gitter.im/webpack/webpack
