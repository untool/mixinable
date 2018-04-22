# mixinable

[![travis](https://img.shields.io/travis/untool/mixinable.svg)](https://travis-ci.org/untool/mixinable)&nbsp;[![npm](https://img.shields.io/npm/v/mixinable.svg)](https://www.npmjs.com/package/mixinable) <br/>

`mixinable` is a small functional utility library allowing you to use [mixins](https://addyosmani.com/resources/essentialjsdesignpatterns/book/#mixinpatternjavascript) in your code. More specifically, it allows you to create mixin containers that apply mixin method application strategies to mixin method implementations.

Mixins are plain classes (or hashes) that can easily be shared, modified and extended using standard language features such as the [`extends` keyword](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends), [spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator#Spread_in_object_literals) or [`Object.assign()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign).

`mixinable` allows you to provide custom [`constructor`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/constructor) functions and supports asynchronous methods returning [`Promises`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promises).

### Installation

Using [NPM](https://www.npmjs.com/get-npm):

```text
npm install -S mixinable
```

Using [Yarn](https://yarnpkg.com/en/):

```text
yarn add mixinable
```

To be able to use `mixinable`, you will have to make sure your environment has full [`Promise`](https://kangax.github.io/compat-table/es6/#test-Promise) support. If, for example, you need to support IE11, you will want to conditionally add a [polyfill](https://github.com/stefanpenner/es6-promise) (2.7kB gzipped).

```html
<!--[if IE]>
<script src="https://cdnjs.cloudflare.com/ajax/libs/es6-promise/4.1.1/es6-promise.auto.min.js"></script>
<![endif]-->
```

### API

#### `define(definition)`

The main export of `mixinable` is a `define()` function accepting a mixin container definition. This definition hash is made up of `strategy` functions prescribing how to handle different mixin methods you provide.

It returns a variadic `mixin()` function that accepts the mixin definitions you want to apply and returns a `create()` function. Mixin definitions are classes or hashes containing mixin method implementations that are being applied using the aforementioned strategies.

And that `create()` function accepts whatever arguments your `constructor()`s accept.

##### Example

```javascript
import define from 'mixinable';

const mixin = define({
  // mixin strategy function
  bar(functions, arg) {
    return functions.pop()(arg);
  },
});

const create = mixin({
  // mixin implementation
  bar(arg) {
    console.log(arg);
  },
});

const foo = create();

foo.bar('yeah!');
// yeah!
```

Speaking of which: `mixinable` creates a separate hidden mixin instance for every mixin you provide. When used inside a mixin method, `this` refers to this hidden instance.

Mixin methods not included in your definition are only accessible from within the mixin instance itself, but not from the outside.

##### Example

```javascript
import define from 'mixinable';

const mixin = define({
  bar(functions, arg) {
    return functions.pop()(arg);
  },
});

const create = mixin({
  // mixin method implementations
  bar(arg) {
    this.qux(arg);
  },
  // private mixin method
  qux(arg) {
    console.log(arg);
  },
});

const foo = create();

foo.bar('yeah!');
// yeah!

console.log(typeof foo.bar, typeof foo.qux);
// function undefined
```

Mixin definitions can be (or contain) custom constructors. These functions are being passed the `create()` function's arguments upon creation.

##### Example

```javascript
import define from 'mixinable';

const mixin = define();

const create = mixin(
  // mixin contructors
  {
    constructor: function(arg) {
      console.log(arg);
    },
  },
  class {
    constructor(arg) {
      console.log(arg);
    }
  }
);

create('yee-hah!');
// yee-hah!
// yee-hah!
```

#### `define.override`

`override` is a helper implementating a mixin strategy that resembles classical inherintance (`class ... extends`): it simply calls the last method implementation.

##### Example

```javascript
import define, { override } from 'mixinable';

const mixin = define({
  // mixin strategy function
  bar: override,
});

const create = mixin(
  // mixin method implementations
  {
    bar() {
      console.log(1);
    },
  },
  class {
    bar() {
      console.log(2);
    }
  }
);

const foo = create();

foo.bar();
// 2
```

`override` returns a `Promise` if one of its implementations does. If you want it to always return a `Promise`, i.e. if you can not be sure whether one of your implementations might return one, please use `define.async.override`.

#### `define.parallel`

`parallel` is a helper implementating a mixin strategy that executes all defined implementations in parallel. This is probably most useful if asynchronous implementations are involved.

##### Example

```javascript
import define, { parallel } from 'mixinable';

const mixin = define({
  // mixin strategy function
  bar: parallel,
});

const create = mixin(
  // mixin method implementations
  {
    bar(val, inc) {
      return Promise.resolve(val + inc);
    },
  },
  class {
    bar(val, inc) {
      return val + inc;
    }
  }
);

const foo = create();

foo.bar(0, 1).then(res => console.log(res));
// [1, 1]
```

`parallel` returns a `Promise` if one of its implementations does. If you want it to always return a `Promise`, i.e. if you can not be sure whether one of your implementations might return one, please use `define.async.parallel`.

#### `define.pipe`

`pipe` is a helper implementating a strategy that passes each implementation's output to the next, using the first argument as the initial value. All other arguments are being passed to all implementations as-is.

##### Example

```javascript
import define, { pipe } from 'mixinable';

const mixin = define({
  // mixin strategy function
  bar: pipe,
});

const create = mixin(
  // mixin method implementations
  {
    bar(val, inc) {
      return Promise.resolve(val + inc);
    },
  },
  class {
    bar(val, inc) {
      return val + inc;
    }
  }
);

const foo = create();

foo.bar(0, 1).then(res => console.log(res));
// 2
```

`pipe` returns a `Promise` if one of its implementations does. If you want it to always return a `Promise`, i.e. if you can not be sure whether one of your implementations might return one, please use `define.async.pipe`.

#### `define.compose`

`compose` works essentially identically as `pipe`, but in reverse order: the very last implementation receives the initial value and the first implementation returns the final output.

##### Example

```javascript
import define, { compose } from 'mixinable';

const mixin = define({
  // mixin strategy function
  bar: compose,
});

// ...
```

`compose` returns a `Promise` if one of its implementations does. If you want it to always return a `Promise`, i.e. if you can not be sure whether one of your implementations might return one, please use `define.async.compose`.

#### Custom Strategies

You can supply your own mixin strategies: such strategies are plain functions that receive the defined implementations as their first argument. The following example shows a naïve re-implementation of the `override` strategy.

##### Example

```javascript
import define from 'mixinable';

const mixin = define({
  // mixin strategy function
  bar(functions, ...args) {
    functions.pop().apply(null, args);
  },
});

const create = mixin({
  // mixin method implementation
  bar(arg) {
    console.log(arg);
  },
});

const foo = create();

foo.bar(1);
// 1
```

#### Utilities

##### `define.async`

All of the strategies described above return a `Promise` if one of their implementations does. If you want them to always return a `Promise` please use `define.async.{override,parallel,pipe,compose}`.

##### `define.sync`

If you want to make sure one of the strategies never returns a `Promise` please use `define.sync.{override,parallel/sequence,pipe,compose}`. If you do, an `Error` will be thrown if a `Promise` is returned.

##### `define.isMixinable(object)`

If you need to check whether an object actually is an instance of a `mixinable`, you can simply test it using this function that returns `true` or `false`.

### Contributing

If you want to contribute to this project, create a fork of its repository using the GitHub UI. Check out your new fork to your computer:

```text
mkdir mixinable && cd $_
git clone git@github.com:user/mixinable.git
```

Afterwards, you can `yarn install` the required dev dependencies and start hacking away. When you are finished, please do go ahead and create a pull request.

`mixinable` itself is (almost) entirely written in ECMAScript 5 and adheres to semistandard code style. Please make sure your contribution does, too.
