'use strict';

var test = require('tape');
var mixin = require('./index');

// basic tests

test('exports test', function (t) {
  t.equal(typeof mixin, 'function',
    'main export should be a function');
  t.equal(typeof mixin.override, 'function',
    'override should be a function');
  t.equal(typeof mixin.parallel, 'function',
    'parallel should be a function');
  t.equal(typeof mixin.pipe, 'function',
    'pipe should be a function');
  t.equal(typeof mixin.sequence, 'function',
    'sequence should be a function');
  t.end();
});

test('basic function test', function (t) {
  var createFoo = mixin({
    foo: function () {}
  });
  t.equal(typeof createFoo, 'function',
    'mixin should create a function');
  t.equal(typeof createFoo.mixin, 'function',
    'mixin output should have mixin method');
  t.equal(typeof createFoo().foo, 'function',
    'instance should have mixed-in method');
  t.end();
});

test('functional inheritance test', function (t) {
  var createFoo = mixin({
    foo: function () {}
  });
  var createBar = createFoo.mixin({
    bar: function () {}
  });
  var bar = createBar();
  t.ok(bar instanceof createBar,
    'instance inherits from constructor');
  t.ok(bar instanceof createFoo,
    'instance inherits from parent constructor');
  t.end();
});

test('object inheritance test', function (t) {
  var Foo = mixin({
    foo: function () {}
  });
  var Bar = Foo.mixin({
    bar: function () {}
  });
  var bar = new Bar();
  t.ok(bar instanceof Bar,
    'instance inherits from class');
  t.ok(bar instanceof Foo,
    'instance inherits from parent class');
  t.end();
});

// override tests

test('contructor override test', function (t) {
  t.plan(2);
  var expectedOptions = {};
  var Foo = mixin({
    constructor: function (options) {
      t.pass('constructor function is being called');
      t.equal(options, expectedOptions,
        'options are being passed');
    }
  });
  var createBar = Foo.mixin();
  createBar(expectedOptions);
});

test('override test', function (t) {
  t.plan(2);
  var Foo = mixin({
    foo: mixin.override(function () {
      t.fail('should never be called');
    }),
    bar: function () {
      t.fail('should never be called');
    }
  });
  var createBar = Foo.mixin({
    foo: function () {
      t.pass('explicitly overriden method should be called');
    },
    bar: function () {
      t.pass('implicitly overriden method should be called');
    }
  });
  var bar = createBar();
  bar.foo();
  bar.bar();
});

// parallel tests

test('parallel test', function (t) {
  t.plan(4);
  var expectedOptions = {};
  var createFoo = mixin(
    {
      foo: mixin.parallel(
        function (options) {
          t.equal(options, expectedOptions,
            '1st implementation is called with options');
        }
      )
    },
    {
      foo: [
        function (options) {
          t.equal(options, expectedOptions,
            '2nd implementation is called with options');
        },
        function (options) {
          t.equal(options, expectedOptions,
            '3rd implementation is called with options');
        }
      ]
    }
  )
  .mixin({
    foo: function (options) {
      t.equal(options, expectedOptions,
        '4th implementation is called with options');
    }
  });
  createFoo().foo(expectedOptions);
});

test('async parallel test', function (t) {
  t.plan(6);
  var counter = 0;
  var expectedOptions = {};
  var createFoo = mixin(
    {
      foo: mixin.parallel(
        function (options) {
          t.equal(counter, 0,
            '1st implementation is called first');
          t.equal(options, expectedOptions,
            '1st implementation is called with options');
          return new Promise(function (resolve) {
            setTimeout(function () {
              counter++;
              resolve();
            }, 1);
          });
        },
        function (options) {
          t.equal(counter, 0,
            '2nd implementation is called without waiting');
          t.equal(options, expectedOptions,
            '2nd implementation is called with options');
          return new Promise(function (resolve) {
            setTimeout(function () {
              counter++;
              resolve();
            }, 1);
          });
        }
      )
    }
  );
  var result = createFoo().foo(expectedOptions);
  t.ok(result instanceof Promise,
    'parallel\'ed method returns a promise');
  result.then(function () {
    t.equal(counter, 2,
      'promise resolves after all implementations');
  })
  .catch(function () {
    t.fail('this is not supposed to happen');
  });
});

// pipe tests

test('pipe test', function (t) {
  t.plan(9);
  var expectedOptions = {};
  var createFoo = mixin(
    {
      increment: function (value) {
        return ++value;
      },
      foo: mixin.pipe(
        function (value, options) {
          t.equal(value, 1,
            '1st implementation is passed inital value');
          t.equal(options, expectedOptions,
            '1st implementation is called with options');
          return this.increment(value);
        }
      )
    },
    {
      foo: [
        function (value, options) {
          t.equal(value, 2,
            '2nd implementation is passed inital value');
          t.equal(options, expectedOptions,
            '2nd implementation is called with options');
          return this.increment(value);
        },
        function (value, options) {
          t.equal(value, 3,
            '3rd implementation is passed updated value');
          t.equal(options, expectedOptions,
            '3rd implementation is called with options');
          return this.increment(value);
        }
      ]
    }
  )
  .mixin({
    foo: function (value, options) {
      t.equal(value, 4,
        '4th implementation is passed resulting value');
      t.equal(options, expectedOptions,
        '4th implementation is called with options');
      return this.increment(value);
    }
  });
  var foo = createFoo();
  var result = foo.foo(1, expectedOptions);
  t.equal(result, 5,
    'pipe\'ed method returns final value');
});

test('async pipe test', function (t) {
  t.plan(6);
  var expectedOptions = {};
  var createFoo = mixin(
    {
      increment: function (value) {
        return ++value;
      },
      foo: mixin.pipe(
        function (value, options) {
          t.equal(value, 1,
            '1st implementation is passed inital value');
          t.equal(options, expectedOptions,
            '1st implementation is called with options');
          return new Promise(function (resolve) {
            setTimeout(resolve.bind(null, this.increment(value)), 1);
          }.bind(this));
        },
        function (value, options) {
          t.equal(value, 2,
            '2nd implementation is passed updated value');
          t.equal(options, expectedOptions,
            '2nd implementation is called with options');
          return new Promise(function (resolve) {
            setTimeout(resolve.bind(null, this.increment(value)), 1);
          }.bind(this));
        }
      )
    }
  );
  var result = createFoo().foo(1, expectedOptions);
  t.ok(result instanceof Promise,
    'pipe\'ed method returns a promise');
  result.then(function (value) {
    t.equal(value, 3,
      'promise resolves to final value');
  })
  .catch(function () {
    t.fail('this is not supposed to happen');
  });
});

// sequence tests

test('sequence test', function (t) {
  t.plan(8);
  var counter = 0;
  var expectedOptions = {};
  var createFoo = mixin(
    {
      foo: mixin.sequence(
        function (options) {
          t.equal(++counter, 1,
            '1st implementation is called first');
          t.equal(options, expectedOptions,
            '1st implementation is called with options');
        }
      )
    },
    {
      foo: [
        function (options) {
          t.equal(++counter, 2,
            '2nd implementation is called second');
          t.equal(options, expectedOptions,
            '2nd implementation is called with options');
        },
        function (options) {
          t.equal(++counter, 3,
            '3rd implementation is called third');
          t.equal(options, expectedOptions,
            '3rd implementation is called with options');
        }
      ]
    }
  )
  .mixin({
    foo: function (options) {
      t.equal(++counter, 4,
        '4th implementation is called fourth');
      t.equal(options, expectedOptions,
        '4th implementation is called with options');
    }
  });
  createFoo().foo(expectedOptions);
});

test('async sequence test', function (t) {
  t.plan(6);
  var counter = 0;
  var expectedOptions = {};
  var createFoo = mixin(
    {
      foo: mixin.sequence(
        function (options) {
          t.equal(counter, 0,
            '1st implementation is called first');
          t.equal(options, expectedOptions,
            '1st implementation is called with options');
          return new Promise(function (resolve) {
            setTimeout(function () {
              counter++;
              resolve();
            }, 10);
          });
        },
        function (options) {
          t.equal(counter, 1,
            '2nd implementation is called after waiting for first');
          t.equal(options, expectedOptions,
            '2nd implementation is called with options');
          return new Promise(function (resolve) {
            setTimeout(function () {
              counter++;
              resolve();
            }, 1);
          });
        }
      )
    }
  );
  var result = createFoo().foo(expectedOptions);
  t.ok(result instanceof Promise,
    'sequence\'ed method returns a promise');
  result.then(function () {
    t.equal(counter, 2,
      'promise resolves after all implementations');
  })
  .catch(function () {
    t.fail('this is not supposed to happen');
  });
});
