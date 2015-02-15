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

#### babel is injecting a runtime into each file and bloating my code!

babel uses a very small runtime for common functions such as `_extend`. By default
this will be added to every file that requires it.

You can instead require the babel runtime as a separate module to avoid the duplication.

The following configuration disables automatic per-file runtime injection in babel, instead
bundling requiring `babel-runtime` and making all helpers use it.

**NOTE:** You must run `npm install babel-runtime --save` to include this in your project.

```javascript
loaders: [
  // the optional 'selfContained' transformer tells babel to require the runtime instead of inlining it.
  {test: /\.jsx?$/, exclude: /node_modules/, loader: 'babel-loader?experimental&optional=selfContained'}
]
```

This can save significant overhead if you use babel in many modules.

## Options

See the `babel` [options](http://babeljs.io/docs/usage/options/)

## License

MIT © Luis Couto
