'use strict';

var test = require('ava');
var mixinable = require('./index');

var async = mixinable.async;
var sync = mixinable.sync;

test('exports test', function(t) {
  t.plan(16);
  t.is(typeof mixinable, 'function', 'main export is a function');
  t.is(typeof mixinable.replicate, 'function', 'replicate is a function');
  t.is(typeof mixinable.clone, 'function', 'clone is a function');
  t.is(typeof mixinable.override, 'function', 'override is a function');
  t.is(typeof mixinable.parallel, 'function', 'parallel is a function');
  t.is(typeof mixinable.pipe, 'function', 'pipe is a function');
  t.is(typeof mixinable.compose, 'function', 'compose is a function');
  t.is(typeof async.override, 'function', 'async.override is a function');
  t.is(typeof async.parallel, 'function', 'async.parallel is a function');
  t.is(typeof async.pipe, 'function', 'async.pipe is a function');
  t.is(typeof async.compose, 'function', 'async.compose is a function');
  t.is(typeof sync.override, 'function', 'sync.override is a function');
  t.is(typeof sync.parallel, 'function', 'sync.parallel is a function');
  t.is(typeof sync.pipe, 'function', 'sync.pipe is a function');
  t.is(typeof sync.sequence, 'function', 'sync.sequence is a function');
  t.is(typeof sync.compose, 'function', 'sync.compose is a function');
});

test('basic function test', function(t) {
  t.plan(3);
  var mixin = mixinable();
  t.is(typeof mixin, 'function', 'mixinable creates a mixin function');
  var create = mixin();
  t.is(typeof create, 'function', 'mixin creates a create function');
  var result = create();
  t.truthy(result, 'create returns something');
});

test('constructor support test', function(t) {
  t.plan(4);
  var arg = 1;
  mixinable({
    constructor: function(_arg) {
      t.is(_arg, arg, 'facade receives correct arg');
    },
  })(
    {
      constructor: function(_arg) {
        t.is(_arg, arg, '1st implementation receives correct arg');
      },
    },
    {
      constructor: function(_arg) {
        t.is(_arg, arg, '2nd implementation receives correct arg');
      },
    },
    {
      constructor: function(_arg) {
        t.is(_arg, arg, '3rd implementation receives correct arg');
      },
    }
  )(arg);
});

test('inheritance test', function(t) {
  t.plan(15);
  var arg = 1;
  function Strategy(_arg) {
    t.pass('strategy constructor is being called');
    t.is(_arg, arg, 'strategy constructor receives correct arg');
    t.true(this instanceof Strategy, 'strategy inherits correctly');
    t.true(
      Strategy.prototype.isPrototypeOf(this),
      'strategy prototype chain is set up'
    );
  }
  Strategy.prototype = {
    foo: function(functions, _arg) {
      t.is(_arg, arg, 'strategy definition receives correct arg');
      t.true(this instanceof Strategy, 'strategy inherits correctly');
      t.true(
        Strategy.prototype.isPrototypeOf(this),
        'strategy prototype chain is set up'
      );
      functions.forEach(function(fn) {
        fn(_arg);
      });
    },
  };
  function Implementation(_arg) {
    t.pass('implementation constructor is being called');
    t.is(_arg, arg, 'implementation constructor receives correct arg');
    t.true(this instanceof Implementation, 'implementation inherits correctly');
    t.true(
      Implementation.prototype.isPrototypeOf(this),
      'implementation prototype chain is set up'
    );
  }
  Implementation.prototype = {
    foo: function(_arg) {
      t.pass('implementation is being called');
      t.is(_arg, arg, 'implementation receives correct arg');
      t.true(
        this instanceof Implementation,
        'implementation inherits correctly'
      );
      t.true(
        Implementation.prototype.isPrototypeOf(this),
        'implementation prototype chain is set up'
      );
    },
  };
  var instance = mixinable(Strategy)(Implementation)(arg);
  instance.foo(arg);
});

test('override helper test', function(t) {
  t.plan(2);
  var arg = 1;
  var instance = mixinable({
    foo: mixinable.override,
  })(
    {
      foo: function() {
        t.fail('1st implementation should not be called');
      },
    },
    {
      foo: function() {
        t.fail('2nd implementation should not be called');
      },
    },
    {
      foo: function(_arg) {
        t.pass('3rd implementation is being called');
        t.is(_arg, arg, '3rd implementation receives correct arg');
      },
    }
  )();
  instance.foo(arg);
});

test('sync parallel helper test', function(t) {
  t.plan(9);
  var arg = 1;
  var ctr = 0;
  var instance = mixinable({
    foo: mixinable.parallel,
  })(
    {
      foo: function(_arg) {
        t.is(_arg, arg, '1st implementation receives correct arg');
        t.is(ctr, 0, '1st implementation is being called first');
        this.increment();
      },
      increment: function() {
        t.pass('1st private method is being called');
        ++ctr;
      },
    },
    {
      foo: function(_arg) {
        t.is(_arg, arg, '2nd implementation receives correct arg');
        t.is(ctr, 1, '2nd implementation is being called second');
        this.increment();
      },
      increment: function() {
        t.pass('2nd private method is being called');
        ++ctr;
      },
    },
    {
      foo: function(_arg) {
        t.is(_arg, arg, '3rd implementation receives correct arg');
        t.is(ctr, 2, '3rd implementation is being called third');
        this.increment();
      },
      increment: function() {
        t.pass('3rd private method is being called');
        ++ctr;
      },
    }
  )();
  instance.foo(arg);
});

test('async parallel helper test', function(t) {
  t.plan(14);
  var arg = 1;
  var ctr = 0;
  var instance = mixinable({
    foo: mixinable.parallel,
  })(
    {
      foo: function(_arg) {
        t.is(_arg, arg, '1st implementation receives correct arg');
        t.is(ctr, 0, '1st implementation is being called instantaneously');
        return new Promise(
          function(resolve) {
            setTimeout(
              function() {
                this.increment();
                resolve(ctr);
              }.bind(this),
              10
            );
          }.bind(this)
        );
      },
      increment: function() {
        t.pass('1st private method is being called');
        ++ctr;
      },
    },
    {
      foo: function(_arg) {
        t.is(_arg, arg, '2nd implementation receives correct arg');
        t.is(ctr, 0, '2nd implementation is being called instantaneously');
        return new Promise(
          function(resolve) {
            setTimeout(
              function() {
                this.increment();
                resolve(ctr);
              }.bind(this),
              5
            );
          }.bind(this)
        );
      },
      increment: function() {
        t.pass('2nd private method is being called');
        ++ctr;
      },
    },
    {
      foo: function(_arg) {
        t.is(_arg, arg, '3rd implementation receives correct arg');
        t.is(ctr, 0, '3rd implementation is being called instantaneously');
        this.increment();
        return ctr;
      },
      increment: function() {
        t.pass('3rd private method is being called');
        ++ctr;
      },
    }
  )();
  var result = instance.foo(arg);
  t.true(result instanceof Promise, 'received result is a promise');
  return result.then(function(result) {
    t.is(result.length, 3, 'promise resolves to array with correct length');
    t.is(result[0], 3, '1st result has correct value');
    t.is(result[1], 2, '2nd result has correct value');
    t.is(result[2], 1, '3rd result has correct value');
  });
});

test('sync pipe helper test', function(t) {
  t.plan(10);
  var arg = 1;
  var instance = mixinable({
    foo: mixinable.pipe,
  })(
    {
      foo: function(ctr, _arg) {
        t.is(ctr, 0, '1st implementation receives inital value');
        t.is(_arg, arg, '1st implementation receives correct arg');
        return this.increment(ctr);
      },
      increment: function(ctr) {
        t.pass('1st private method is being called');
        return ++ctr;
      },
    },
    {
      foo: function(ctr, _arg) {
        t.is(ctr, 1, "2nd implementation receives 1st's result");
        t.is(_arg, arg, '2nd implementation receives correct arg');
        return this.increment(ctr);
      },
      increment: function(ctr) {
        t.pass('2nd private method is being called');
        return ++ctr;
      },
    },
    {
      foo: function(ctr, _arg) {
        t.is(ctr, 2, "3rd implementation receives 2nd's result");
        t.is(_arg, arg, '3rd implementation receives correct arg');
        return this.increment(ctr);
      },
      increment: function(ctr) {
        t.pass('3rd private method is being called');
        return ++ctr;
      },
    }
  )();
  t.is(instance.foo(0, arg), 3, 'correct result received');
});

test('async pipe helper test', function(t) {
  t.plan(11);
  var arg = 1;
  var instance = mixinable({
    foo: mixinable.pipe,
  })(
    {
      foo: function(ctr, _arg) {
        t.is(ctr, 0, '1st implementation receives inital value');
        t.is(_arg, arg, '1st implementation receives correct arg');
        return new Promise(
          function(resolve) {
            setTimeout(
              function() {
                resolve(this.increment(ctr));
              }.bind(this),
              10
            );
          }.bind(this)
        );
      },
      increment: function(ctr) {
        t.pass('1st private method is being called');
        return ++ctr;
      },
    },
    {
      foo: function(ctr, _arg) {
        t.is(ctr, 1, "2nd implementation receives 1st's result");
        t.is(_arg, arg, '2nd implementation receives correct arg');
        return new Promise(
          function(resolve) {
            setTimeout(
              function() {
                resolve(this.increment(ctr));
              }.bind(this),
              5
            );
          }.bind(this)
        );
      },
      increment: function(ctr) {
        t.pass('2nd private method is being called');
        return ++ctr;
      },
    },
    {
      foo: function(ctr, _arg) {
        t.is(ctr, 2, "3rd implementation receives 2nd's result");
        t.is(_arg, arg, '3rd implementation receives correct arg');
        return this.increment(ctr);
      },
      increment: function(ctr) {
        t.pass('3rd private method is being called');
        return ++ctr;
      },
    }
  )();
  var result = instance.foo(0, arg);
  t.true(result instanceof Promise, 'received result is a promise');
  return result.then(function(result) {
    t.is(result, 3, 'promise resolves to correct value');
  });
});

test('sync compose helper test', function(t) {
  t.plan(10);
  var arg = 1;
  var instance = mixinable({
    foo: mixinable.compose,
  })(
    {
      foo: function(ctr, _arg) {
        t.is(ctr, 2, "1st implementation receives 2nd's result");
        t.is(_arg, arg, '1st implementation receives correct arg');
        return this.increment(ctr);
      },
      increment: function(ctr) {
        t.pass('1st private method is being called');
        return ++ctr;
      },
    },
    {
      foo: function(ctr, _arg) {
        t.is(ctr, 1, "2nd implementation receives 1st's result");
        t.is(_arg, arg, '2nd implementation receives correct arg');
        return this.increment(ctr);
      },
      increment: function(ctr) {
        t.pass('2nd private method is being called');
        return ++ctr;
      },
    },
    {
      foo: function(ctr, _arg) {
        t.is(ctr, 0, '3rd implementation receives inital value');
        t.is(_arg, arg, '3rd implementation receives correct arg');
        return this.increment(ctr);
      },
      increment: function(ctr) {
        t.pass('3rd private method is being called');
        return ++ctr;
      },
    }
  )();
  t.is(instance.foo(0, arg), 3, 'correct result received');
});

test('async compose helper test', function(t) {
  t.plan(11);
  var arg = 1;
  var instance = mixinable({
    foo: mixinable.compose,
  })(
    {
      foo: function(ctr, _arg) {
        t.is(ctr, 2, "1st implementation receives 2nd's result");
        t.is(_arg, arg, '1st implementation receives correct arg');
        return this.increment(ctr);
      },
      increment: function(ctr) {
        t.pass('1st private method is being called');
        return ++ctr;
      },
    },
    {
      foo: function(ctr, _arg) {
        t.is(ctr, 1, "2nd implementation receives 1st's result");
        t.is(_arg, arg, '2nd implementation receives correct arg');
        return new Promise(
          function(resolve) {
            setTimeout(
              function() {
                resolve(this.increment(ctr));
              }.bind(this),
              5
            );
          }.bind(this)
        );
      },
      increment: function(ctr) {
        t.pass('2nd private method is being called');
        return ++ctr;
      },
    },
    {
      foo: function(ctr, _arg) {
        t.is(ctr, 0, '3rd implementation receives inital value');
        t.is(_arg, arg, '3rd implementation receives correct arg');
        return new Promise(
          function(resolve) {
            setTimeout(
              function() {
                resolve(this.increment(ctr));
              }.bind(this),
              10
            );
          }.bind(this)
        );
      },
      increment: function(ctr) {
        t.pass('3rd private method is being called');
        return ++ctr;
      },
    }
  )();
  var result = instance.foo(0, arg);
  t.true(result instanceof Promise, 'received result is a promise');
  return result.then(function(result) {
    t.is(result, 3, 'promise resolves to correct value');
  });
});

test('async helper test', function(t) {
  t.plan(4);
  var instance = mixinable({
    foo: async.override,
    bar: async.parallel,
    baz: async.pipe,
    qux: async.compose,
  })({
    foo: function() {},
    bar: function() {},
    baz: function() {},
    qux: function() {},
  })();
  t.true(instance.foo() instanceof Promise, 'override result is a promise');
  t.true(instance.bar() instanceof Promise, 'parallel result is a promise');
  t.true(instance.baz() instanceof Promise, 'pipe result is a promise');
  t.true(instance.qux() instanceof Promise, 'compose result is a promise');
});

test('sync helper test', function(t) {
  t.plan(5);
  var instance = mixinable({
    foo: sync.override,
    bar: sync.parallel,
    baz: sync.pipe,
    qux: sync.sequence,
    quz: sync.compose,
  })({
    foo: function() {
      return Promise.resolve();
    },
    bar: function() {
      return Promise.resolve();
    },
    baz: function() {
      return Promise.resolve();
    },
    qux: function() {
      return Promise.resolve();
    },
    quz: function() {
      return Promise.resolve();
    },
  })();
  t.throws(
    instance.foo.bind(instance),
    'got promise in sync mode',
    'override throws if result is a promise'
  );
  t.throws(
    instance.bar.bind(instance),
    'got promise in sync mode',
    'parallel throws if result is a promise'
  );
  t.throws(
    instance.baz.bind(instance),
    'got promise in sync mode',
    'pipe throws if result is a promise'
  );
  t.throws(
    instance.qux.bind(instance),
    'got promise in sync mode',
    'sequence throws if result is a promise'
  );
  t.throws(
    instance.quz.bind(instance),
    'got promise in sync mode',
    'compose throws if result is a promise'
  );
});

test('isMixinable function test', function(t) {
  t.plan(5);
  t.falsy(mixinable.isMixinable(), 'non-mixinable is detected');
  t.falsy(mixinable.isMixinable({}), 'non-mixinable is detected');
  t.falsy(mixinable.isMixinable(null), 'non-mixinable is detected');
  t.falsy(mixinable.isMixinable(undefined), 'non-mixinable is detected');
  t.truthy(mixinable.isMixinable(mixinable()()()), 'mixinable is detected');
});

test('replicate function test', function(t) {
  t.plan(3);
  var arg1 = 1;
  var arg2 = 2;
  var create = mixinable({
    foo: mixinable.override,
  })({
    constructor: function(bar) {
      this.foo = function() {
        return bar;
      };
    },
  });
  var instance = create(arg1);
  t.is(instance.foo(), arg1, 'instance returns expected value');
  var replicate = mixinable.replicate(function(initialArgs, newArgs) {
    t.pass('handleArgs is being called');
    return [initialArgs[0] + newArgs[0]];
  });
  var replica = replicate(instance, arg2);
  t.is(replica.foo(), arg1 + arg2, 'clone returns expected value');
});

test('clone function test', function(t) {
  t.plan(2);
  var arg1 = 1;
  var arg2 = 2;
  var create = mixinable({
    foo: mixinable.override,
  })({
    constructor: function(bar, baz) {
      this.foo = function() {
        return bar + (baz || 0);
      };
    },
  });
  var instance = create(arg1);
  t.is(instance.foo(), arg1, 'instance returns expected value');
  var clone = mixinable.clone(instance, arg2);
  t.is(clone.foo(), arg1 + arg2, 'clone returns expected value');
});

test('internal mixin method test', function(t) {
  t.plan(2);
  var create = mixinable({
    foo: mixinable.override,
    bar: mixinable.override,
  })(
    {
      foo: function() {
        t.pass('first method is being called directly');
        this.bar();
      },
    },
    {
      bar: function() {
        t.pass('second method is being called indirectly');
      },
    }
  );
  create().foo();
});
