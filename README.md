# 6to5-loader

> Turn ES6 code into vanilla ES5 with no runtime required using [6to5](https://github.com/sebmck/6to5);

__Notes:__ Issues with the output should be reported on the 6to5 [issue tracker](https://github.com/sebmck/6to5/issues);

## Install

```
$ npm install --save-dev 6to5-loader
```

## Usage

```javascript
import Animal from '6to5!./Animal.js';

class Person extends Animal {
  constructor(arg='default') {
    this.eat = 'Happy Meal';
  }
}

export default Person;
```

```javascript
var Person = require('6to5!./Person.js').default;
new Person();
```

Or within the webpack config:

```javascript
module: {
    loaders: [
        { test: /\.js$/, exclude: /node_modules/, loader: '6to5-loader'}
    ]
}
```

and then import normally:

```javascript
import Person from './Person.js';
```

## Troubleshooting

#### 6to5-loader is slow!

Make sure you are transforming as few files as possible. Because you are probably 
matching `/\.js$/`, you might be transforming the `node_modules` folder or other unwanted
source. See the `exclude` option in the `loaders` config as documented above.

#### 6to5 is injecting a runtime into each file and bloating my code!

6to5 uses a very small runtime for common functions such as `_extend`. By default
this will be added to every file that requires it.

You can instead require the 6to5 runtime as a separate module to avoid the duplication.

The following configuration disables automatic per-file runtime injection in 6to5, instead
bundling requiring `6to5-runtime` and making all helpers use it.

**NOTE:** You must run `npm install 6to5-runtime --save` to include this in your project.

```javascript
loaders: [
  // runtime=true tells 6to5 to expect a runtime, but we still need to bundle it.
  {test: /\.jsx?$/, exclude: /node_modules/, loader: '6to5-loader?experimental&optional=selfContained'}
]
```

This can save significant overhead if you use 6to5 in many modules.

## Options

See the `6to5` [options](http://6to5.org/docs/usage/options/)

## License

MIT © Luis Couto
