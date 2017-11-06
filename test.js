'use strict';

var test = require('tape');
var mixin = require('./index');

// basic tests

test('exports test', function (t) {
  t.equal(typeof mixin, 'function', 'main export is a function');
  t.equal(typeof mixin.override, 'function', 'override is a function');
  t.equal(typeof mixin.parallel, 'function', 'parallel is a function');
  t.equal(typeof mixin.pipe, 'function', 'pipe is a function');
  t.equal(typeof mixin.sequence, 'function', 'sequence is a function');
  t.end();
});

test('basic function test', function (t) {
  var createFoo = mixin({
    foo: function () {}
  });
  t.equal(typeof createFoo, 'function', 'mixin creates a function');
  t.equal(typeof createFoo.mixin, 'function', 'mixinable has mixin method');
  t.equal(typeof createFoo().foo, 'function', 'instance has mixed-in method');
  t.end();
});

test('functional inheritance test', function (t) {
  var createFoo = mixin();
  var createBar = createFoo.mixin();
  var bar = createBar();
  t.ok(bar instanceof createBar, 'instance inherits from constructor');
  t.ok(bar instanceof createFoo, 'instance inherits from parent constructor');
  t.end();
});

test('object inheritance test', function (t) {
  var Foo = mixin();
  var Bar = Foo.mixin();
  var bar = new Bar();
  t.ok(bar instanceof Bar, 'instance inherits from class');
  t.ok(bar instanceof Foo, 'instance inherits from parent class');
  t.end();
});

// override tests

test('contructor override test', function (t) {
  t.plan(3);
  var expectedOptions = {};
  var Foo = mixin({
    constructor: function (options) {
      t.pass('constructor function is being called');
      t.equal(options, expectedOptions, 'options are being passed');
      t.ok(this instanceof Foo, 'inheritance is set up correctly');
    }
  });
  var createBar = Foo.mixin();
  createBar(expectedOptions);
});

test('override test', function (t) {
  t.plan(4);
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
      t.pass('explicitly overriden method is being called');
      t.ok(this instanceof createBar, 'inheritance is set up correctly');
    },
    bar: function () {
      t.pass('implicitly overriden method is being called');
      t.ok(this instanceof createBar, 'inheritance is set up correctly');
    }
  });
  var bar = createBar();
  bar.foo();
  bar.bar();
});

// parallel tests

test('parallel test', function (t) {
  t.plan(8);
  var expectedOptions = {};
  var createFoo = mixin(
    {
      foo: mixin.parallel(
        function (options) {
          t.equal(options, expectedOptions, '1st is being called with options');
          t.ok(this instanceof createFoo, 'inheritance is set up correctly');
        }
      )
    },
    {
      foo: [
        function (options) {
          t.equal(options, expectedOptions, '2nd is being called with options');
          t.ok(this instanceof createFoo, 'inheritance is set up correctly');
        },
        function (options) {
          t.equal(options, expectedOptions, '3rd is being called with options');
          t.ok(this instanceof createFoo, 'inheritance is set up correctly');
        }
      ]
    }
  )
  .mixin({
    foo: function (options) {
      t.equal(options, expectedOptions, '4th is being called with options');
      t.ok(this instanceof createFoo, 'inheritance is set up correctly');
    }
  });
  createFoo().foo(expectedOptions);
});

test('async parallel test', function (t) {
  t.plan(11);
  var counter = 0;
  var expectedOptions = {};
  var createFoo = mixin(
    {
      foo: mixin.parallel(
        function (options) {
          t.equal(counter, 0, '1st is being called first');
          t.equal(options, expectedOptions, '1st is being called with options');
          t.ok(this instanceof createFoo, 'inheritance is set up correctly');
          return new Promise(function (resolve) {
            setTimeout(function () {
              counter++;
              resolve();
            }, 1);
          });
        },
        function (options) {
          t.equal(counter, 0, '2nd is being called without waiting');
          t.equal(options, expectedOptions, '2nd is being called with options');
          t.ok(this instanceof createFoo, 'inheritance is set up correctly');
          return new Promise(function (resolve) {
            setTimeout(function () {
              counter++;
              resolve();
            }, 1);
          });
        }
      )
    }
  )
  .mixin({
    foo: function (options) {
      t.equal(counter, 0, '3rd is being called without waiting');
      t.equal(options, expectedOptions, '3rd is being called with options');
      t.ok(this instanceof createFoo, 'inheritance is set up correctly');
      return ++counter;
    }
  });
  var result = createFoo().foo(expectedOptions);
  t.ok(result instanceof Promise, 'parallel\'ed method returns a promise');
  result.then(function () {
    t.equal(counter, 3, 'promise resolves after everything else');
  })
  .catch(function () {
    t.fail('this is not supposed to happen');
  });
});

// pipe tests

test('pipe test', function (t) {
  t.plan(13);
  var expectedOptions = {};
  var createFoo = mixin(
    {
      increment: function (value) {
        return ++value;
      },
      foo: mixin.pipe(
        function (value, options) {
          t.equal(value, 1, '1st is being passed inital value');
          t.equal(options, expectedOptions, '1st is being called with options');
          t.ok(this instanceof createFoo, 'inheritance is set up correctly');
          return this.increment(value);
        }
      )
    },
    {
      foo: [
        function (value, options) {
          t.equal(value, 2, '2nd is being passed inital value');
          t.equal(options, expectedOptions, '2nd is being called with options');
          t.ok(this instanceof createFoo, 'inheritance is set up correctly');
          return this.increment(value);
        },
        function (value, options) {
          t.equal(value, 3, '3rd is being passed updated value');
          t.equal(options, expectedOptions, '3rd is being called with options');
          t.ok(this instanceof createFoo, 'inheritance is set up correctly');
          return this.increment(value);
        }
      ]
    }
  )
  .mixin({
    foo: function (value, options) {
      t.equal(value, 4, '4th is being passed resulting value');
      t.equal(options, expectedOptions, '4th is being called with options');
      t.ok(this instanceof createFoo, 'inheritance is set up correctly');
      return this.increment(value);
    }
  });
  var foo = createFoo();
  var result = foo.foo(1, expectedOptions);
  t.equal(result, 5, 'pipe\'ed method returns final value');
});

test('async pipe test', function (t) {
  t.plan(11);
  var expectedOptions = {};
  var createFoo = mixin(
    {
      increment: function (value) {
        return ++value;
      },
      foo: mixin.pipe(
        function (value, options) {
          t.equal(value, 1, '1st is being passed inital value');
          t.equal(options, expectedOptions, '1st is being called with options');
          t.ok(this instanceof createFoo, 'inheritance is set up correctly');
          return new Promise(function (resolve) {
            setTimeout(resolve.bind(null, this.increment(value)), 1);
          }.bind(this));
        },
        function (value, options) {
          t.equal(value, 2, '2nd is being passed updated value');
          t.equal(options, expectedOptions, '2nd is being called with options');
          t.ok(this instanceof createFoo, 'inheritance is set up correctly');
          return new Promise(function (resolve) {
            setTimeout(resolve.bind(null, this.increment(value)), 1);
          }.bind(this));
        }
      )
    }
  )
  .mixin({
    foo: function (value, options) {
      t.equal(value, 3, '3rd is being passed updated value');
      t.equal(options, expectedOptions, '3rd is being called with options');
      t.ok(this instanceof createFoo, 'inheritance is set up correctly');
      return this.increment(value);
    }
  });
  var result = createFoo().foo(1, expectedOptions);
  t.ok(result instanceof Promise, 'pipe\'ed method returns a promise');
  result.then(function (value) {
    t.equal(value, 4, 'promise resolves to final value');
  })
  .catch(function () {
    t.fail('this is not supposed to happen');
  });
});

// sequence tests

test('sequence test', function (t) {
  t.plan(12);
  var counter = 0;
  var expectedOptions = {};
  var createFoo = mixin(
    {
      foo: mixin.sequence(
        function (options) {
          t.equal(++counter, 1, '1st is being called first');
          t.equal(options, expectedOptions, '1st is being called with options');
          t.ok(this instanceof createFoo, 'inheritance is set up correctly');
        }
      )
    },
    {
      foo: [
        function (options) {
          t.equal(++counter, 2, '2nd is being called second');
          t.equal(options, expectedOptions, '2nd is being called with options');
          t.ok(this instanceof createFoo, 'inheritance is set up correctly');
        },
        function (options) {
          t.equal(++counter, 3, '3rd is being called third');
          t.equal(options, expectedOptions, '3rd is being called with options');
          t.ok(this instanceof createFoo, 'inheritance is set up correctly');
        }
      ]
    }
  )
  .mixin({
    foo: function (options) {
      t.equal(++counter, 4, '4th is being called fourth');
      t.equal(options, expectedOptions, '4th is being called with options');
      t.ok(this instanceof createFoo, 'inheritance is set up correctly');
    }
  });
  createFoo().foo(expectedOptions);
});

test('async sequence test', function (t) {
  t.plan(8);
  var counter = 0;
  var expectedOptions = {};
  var createFoo = mixin(
    {
      foo: mixin.sequence(
        function (options) {
          t.equal(counter, 0, '1st is being called first');
          t.equal(options, expectedOptions, '1st is being called with options');
          t.ok(this instanceof createFoo, 'inheritance is set up correctly');
          return new Promise(function (resolve) {
            setTimeout(function () {
              counter++;
              resolve();
            }, 10);
          });
        },
        function (options) {
          t.equal(counter, 1, '2nd is being called after waiting for first');
          t.equal(options, expectedOptions, '2nd is being called with options');
          t.ok(this instanceof createFoo, 'inheritance is set up correctly');
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
  t.ok(result instanceof Promise, 'sequence\'ed method returns a promise');
  result.then(function () {
    t.equal(counter, 2, 'promise resolves after everything else');
  })
  .catch(function () {
    t.fail('this is not supposed to happen');
  });
});
