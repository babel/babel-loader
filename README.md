# 6to5-loader

> Turn ES6 code into vanilla ES5 with no runtime required using [6to5](https://github.com/sebmck/6to5);

__Notes:__ Issues with the output should be reported on the 6to5 [issue tracker](https://github.com/sebmck/6to5/issues);

## Install

```
$ npm install --save-dev 6to5-loader
```

## Usage

```
import Animal from '6to5!./Animal.js';

class Person extends Animal {
  constructor(arg='default') {
    this.eat = 'Happy Meal';
  }
}

export default Person;
```

```
var Person = require('6to5!./Person.js').default;
new Person();
```

Or within the webpack config:

```
module: {
    loaders: [
        { test: /\.js$/, loader: '6to5-loader'}
    ]
}
```

and then import normally:

```
import Person from './Person.js';
```

## Options

See the `6to5` [options](https://6to5.github.io/usage.html#options)

## License

MIT © Luis Couto
