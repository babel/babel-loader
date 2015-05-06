# babel-loader

> Turn ES6 code into vanilla ES5 with no runtime required using [babel](https://github.com/babel/babel);

## Install

```
$ npm install --save-dev babel-loader
```

## Usage

```javascript
import Animal from 'babel!./Animal.js';

class Person extends Animal {
  constructor(arg='default') {
    this.eat = 'Happy Meal';
  }
}

export default Person;
```

```javascript
var Person = require('babel!./Person.js').default;
new Person();
```

Or within the webpack config:

```javascript
module: {
    loaders: [
        { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'}
    ]
}
```

and then import normally:

```javascript
import Person from './Person.js';
```

## Troubleshooting

#### babel-loader is slow!

Make sure you are transforming as few files as possible. Because you are probably 
matching `/\.js$/`, you might be transforming the `node_modules` folder or other unwanted
source. See the `exclude` option in the `loaders` config as documented above.

#### babel is injecting helpers into each file and bloating my code!

babel uses very small helpers for common functions such as `_extend`. By default
this will be added to every file that requires it.

You can instead require the babel runtime as a separate module to avoid the duplication.

The following configuration disables automatic per-file runtime injection in babel, instead
requiring `babel-runtime` and making all helper references use it.

See the [docs](https://babeljs.io/docs/usage/runtime) for more information.

**NOTE:** You must run `npm install babel-runtime --save` to include this in your project.

```javascript
loaders: [
  // the optional 'runtime' transformer tells babel to require the runtime instead of inlining it.
  { test: /\.jsx?$/, exclude: /node_modules/, loader: 'babel-loader?optional=runtime' }
]
```

#### custom polyfills (e.g. Promise library)

Since Babel includes a polyfill that includes a custom [regenerator runtime](https://github.com/facebook/regenerator/blob/master/runtime.js) and [core.js](https://github.com/zloirock/core-js), the following usual shimming method using `webpack.ProvidePlugin` will not work:

```javascript
// ...
        new webpack.ProvidePlugin({
            'Promise': 'bluebird'
        }),
// ...
```

The following approach will not work either:

```javascript
require('babel-runtime/core-js/promise').default = require('bluebird');

var promise = new Promise;
```

which outputs to (using `runtime`):

```javascript
'use strict';

var _Promise = require('babel-runtime/core-js/promise')['default'];

require('babel-runtime/core-js/promise')['default'] = require('bluebird');

var promise = new _Promise();
```

The previous `Promise` library is referenced and used before it is overridden.

One approach is to have a "bootstrap" step in your application that would first override the default globals before your application:

```javascript
// bootstrap.js

require('babel-runtime/core-js/promise').default = require('bluebird');

// ...

require('./app');
```

## Options

See the `babel` [options](http://babeljs.io/docs/usage/options/)

This loader also supports the following loader-specific option:

* `cacheDirectory`: When set, the given directory will be used to cache the results of the loader.
  Future webpack builds will attempt to read from the cache to avoid needing to run the potentially
  expensive Babel recompilation process on each run. A value of `true` will cause the loader to
  use the default OS temporary file directory.

Note: The `sourceMap` option is ignored, instead sourceMaps are automatically enabled when webpack is configured to use them (via the `devtool` config option).

## License

MIT © Luis Couto
