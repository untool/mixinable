'use strict';

const test = require('ava');
const mixinable = require('./index');
const { async, sync, callable, override, parallel, pipe, compose } = mixinable;

test('exports test', function(t) {
  t.plan(17);
  t.is(typeof mixinable, 'function', 'main export is a function');
  t.is(typeof callable, 'function', 'callable is a function');
  t.is(typeof override, 'function', 'override is a function');
  t.is(typeof parallel, 'function', 'parallel is a function');
  t.is(typeof pipe, 'function', 'pipe is a function');
  t.is(typeof compose, 'function', 'compose is a function');
  t.is(typeof async.callable, 'function', 'async.callable is a function');
  t.is(typeof async.override, 'function', 'async.override is a function');
  t.is(typeof async.parallel, 'function', 'async.parallel is a function');
  t.is(typeof async.pipe, 'function', 'async.pipe is a function');
  t.is(typeof async.compose, 'function', 'async.compose is a function');
  t.is(typeof sync.callable, 'function', 'sync.callable is a function');
  t.is(typeof sync.override, 'function', 'sync.override is a function');
  t.is(typeof sync.parallel, 'function', 'sync.parallel is a function');
  t.is(typeof sync.pipe, 'function', 'sync.pipe is a function');
  t.is(typeof sync.sequence, 'function', 'sync.sequence is a function');
  t.is(typeof sync.compose, 'function', 'sync.compose is a function');
});

test('basic function test', function(t) {
  t.plan(2);
  const create = mixinable();
  t.is(typeof create, 'function', 'mixinable creates a create function');
  const result = create();
  t.truthy(result, 'create returns something');
});

test('constructor support test', function(t) {
  t.plan(3);
  const arg = 1;
  mixinable({}, [
    class X {
      constructor(_arg) {
        t.is(_arg, arg, '1st implementation receives correct arg');
      }
    },
    class X {
      constructor(_arg) {
        t.is(_arg, arg, '2nd implementation receives correct arg');
      }
    },
    class X {
      constructor(_arg) {
        t.is(_arg, arg, '3rd implementation receives correct arg');
      }
    },
  ])(arg);
});

test('inheritance test', function(t) {
  t.plan(8);
  const arg = 1;
  class Implementation {
    constructor(_arg) {
      t.pass('implementation constructor is being called');
      t.is(_arg, arg, 'implementation constructor receives correct arg');
      t.true(
        this instanceof Implementation,
        'implementation inherits correctly'
      );
      t.true(
        Object.prototype.isPrototypeOf.call(Implementation.prototype, this),
        'implementation prototype chain is set up'
      );
    }
    foo(_arg) {
      t.pass('implementation is being called');
      t.is(_arg, arg, 'implementation receives correct arg');
      t.true(
        this instanceof Implementation,
        'implementation inherits correctly'
      );
      t.true(
        Object.prototype.isPrototypeOf.call(Implementation.prototype, this),
        'implementation prototype chain is set up'
      );
    }
  }
  const instance = mixinable({ foo: override }, [Implementation])(arg);
  instance.foo(arg);
});

test('callable helper test', function(t) {
  t.plan(2);
  const arg = 1;
  const instance = mixinable(
    {
      foo: callable,
    },
    [
      class X {
        foo() {
          t.fail('1st implementation should not be called');
        }
      },
      class X {
        foo() {
          t.fail('2nd implementation should not be called');
        }
      },
      class X {
        foo(_arg) {
          t.pass('3rd implementation is being called');
          t.is(_arg, arg, '3rd implementation receives correct arg');
        }
      },
    ]
  )();
  instance.foo(arg);
});

test('override helper test', function(t) {
  t.plan(2);
  const arg = 1;
  const instance = mixinable(
    {
      foo: override,
    },
    [
      class X {
        foo() {
          t.fail('1st implementation should not be called');
        }
      },
      class X {
        foo() {
          t.fail('2nd implementation should not be called');
        }
      },
      class X {
        foo(_arg) {
          t.pass('3rd implementation is being called');
          t.is(_arg, arg, '3rd implementation receives correct arg');
        }
      },
    ]
  )();
  instance.foo(arg);
});

test('sync parallel helper test', function(t) {
  t.plan(9);
  const arg = 1;
  let ctr = 0;
  const instance = mixinable(
    {
      foo: parallel,
    },
    [
      class X {
        foo(_arg) {
          t.is(_arg, arg, '1st implementation receives correct arg');
          t.is(ctr, 0, '1st implementation is being called first');
          this.increment();
        }
        increment() {
          t.pass('1st private method is being called');
          ++ctr;
        }
      },
      class X {
        foo(_arg) {
          t.is(_arg, arg, '2nd implementation receives correct arg');
          t.is(ctr, 1, '2nd implementation is being called second');
          this.increment();
        }
        increment() {
          t.pass('2nd private method is being called');
          ++ctr;
        }
      },
      class X {
        foo(_arg) {
          t.is(_arg, arg, '3rd implementation receives correct arg');
          t.is(ctr, 2, '3rd implementation is being called third');
          this.increment();
        }
        increment() {
          t.pass('3rd private method is being called');
          ++ctr;
        }
      },
    ]
  )();
  instance.foo(arg);
});

test('async parallel helper test', function(t) {
  t.plan(14);
  const arg = 1;
  let ctr = 0;
  const instance = mixinable(
    {
      foo: parallel,
    },
    [
      class X {
        foo(_arg) {
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
        }
        increment() {
          t.pass('1st private method is being called');
          ++ctr;
        }
      },
      class X {
        foo(_arg) {
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
        }
        increment() {
          t.pass('2nd private method is being called');
          ++ctr;
        }
      },
      class X {
        foo(_arg) {
          t.is(_arg, arg, '3rd implementation receives correct arg');
          t.is(ctr, 0, '3rd implementation is being called instantaneously');
          this.increment();
          return ctr;
        }
        increment() {
          t.pass('3rd private method is being called');
          ++ctr;
        }
      },
    ]
  )();
  const result = instance.foo(arg);
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
  const arg = 1;
  const instance = mixinable(
    {
      foo: pipe,
    },
    [
      class X {
        foo(ctr, _arg) {
          t.is(ctr, 0, '1st implementation receives inital value');
          t.is(_arg, arg, '1st implementation receives correct arg');
          return this.increment(ctr);
        }
        increment(ctr) {
          t.pass('1st private method is being called');
          return ++ctr;
        }
      },
      class X {
        foo(ctr, _arg) {
          t.is(ctr, 1, "2nd implementation receives 1st's result");
          t.is(_arg, arg, '2nd implementation receives correct arg');
          return this.increment(ctr);
        }
        increment(ctr) {
          t.pass('2nd private method is being called');
          return ++ctr;
        }
      },
      class X {
        foo(ctr, _arg) {
          t.is(ctr, 2, "3rd implementation receives 2nd's result");
          t.is(_arg, arg, '3rd implementation receives correct arg');
          return this.increment(ctr);
        }
        increment(ctr) {
          t.pass('3rd private method is being called');
          return ++ctr;
        }
      },
    ]
  )();
  t.is(instance.foo(0, arg), 3, 'correct result received');
});

test('async pipe helper test', function(t) {
  t.plan(11);
  const arg = 1;
  const instance = mixinable(
    {
      foo: pipe,
    },
    [
      class X {
        foo(ctr, _arg) {
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
        }
        increment(ctr) {
          t.pass('1st private method is being called');
          return ++ctr;
        }
      },
      class X {
        foo(ctr, _arg) {
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
        }
        increment(ctr) {
          t.pass('2nd private method is being called');
          return ++ctr;
        }
      },
      class X {
        foo(ctr, _arg) {
          t.is(ctr, 2, "3rd implementation receives 2nd's result");
          t.is(_arg, arg, '3rd implementation receives correct arg');
          return this.increment(ctr);
        }
        increment(ctr) {
          t.pass('3rd private method is being called');
          return ++ctr;
        }
      },
    ]
  )();
  const result = instance.foo(0, arg);
  t.true(result instanceof Promise, 'received result is a promise');
  return result.then(function(result) {
    t.is(result, 3, 'promise resolves to correct value');
  });
});

test('sync compose helper test', function(t) {
  t.plan(10);
  const arg = 1;
  const instance = mixinable(
    {
      foo: compose,
    },
    [
      class X {
        foo(ctr, _arg) {
          t.is(ctr, 2, "1st implementation receives 2nd's result");
          t.is(_arg, arg, '1st implementation receives correct arg');
          return this.increment(ctr);
        }
        increment(ctr) {
          t.pass('1st private method is being called');
          return ++ctr;
        }
      },
      class X {
        foo(ctr, _arg) {
          t.is(ctr, 1, "2nd implementation receives 1st's result");
          t.is(_arg, arg, '2nd implementation receives correct arg');
          return this.increment(ctr);
        }
        increment(ctr) {
          t.pass('2nd private method is being called');
          return ++ctr;
        }
      },
      class X {
        foo(ctr, _arg) {
          t.is(ctr, 0, '3rd implementation receives inital value');
          t.is(_arg, arg, '3rd implementation receives correct arg');
          return this.increment(ctr);
        }
        increment(ctr) {
          t.pass('3rd private method is being called');
          return ++ctr;
        }
      },
    ]
  )();
  t.is(instance.foo(0, arg), 3, 'correct result received');
});

test('async compose helper test', function(t) {
  t.plan(11);
  const arg = 1;
  const instance = mixinable(
    {
      foo: compose,
    },
    [
      class X {
        foo(ctr, _arg) {
          t.is(ctr, 2, "1st implementation receives 2nd's result");
          t.is(_arg, arg, '1st implementation receives correct arg');
          return this.increment(ctr);
        }
        increment(ctr) {
          t.pass('1st private method is being called');
          return ++ctr;
        }
      },
      class X {
        foo(ctr, _arg) {
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
        }
        increment(ctr) {
          t.pass('2nd private method is being called');
          return ++ctr;
        }
      },
      class X {
        foo(ctr, _arg) {
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
        }
        increment(ctr) {
          t.pass('3rd private method is being called');
          return ++ctr;
        }
      },
    ]
  )();
  const result = instance.foo(0, arg);
  t.true(result instanceof Promise, 'received result is a promise');
  return result.then(function(result) {
    t.is(result, 3, 'promise resolves to correct value');
  });
});

test('async helper test', function(t) {
  t.plan(4);
  const instance = mixinable(
    {
      foo: async.override,
      bar: async.parallel,
      baz: async.pipe,
      qux: async.compose,
    },
    [
      class X {
        foo() {}
        bar() {}
        baz() {}
        qux() {}
      },
    ]
  )();
  t.true(instance.foo() instanceof Promise, 'override result is a promise');
  t.true(instance.bar() instanceof Promise, 'parallel result is a promise');
  t.true(instance.baz() instanceof Promise, 'pipe result is a promise');
  t.true(instance.qux() instanceof Promise, 'compose result is a promise');
});

test('sync helper test', function(t) {
  t.plan(5);
  const instance = mixinable(
    {
      foo: sync.override,
      bar: sync.parallel,
      baz: sync.pipe,
      qux: sync.sequence,
      quz: sync.compose,
    },
    [
      class X {
        foo() {
          return Promise.resolve();
        }
        bar() {
          return Promise.resolve();
        }
        baz() {
          return Promise.resolve();
        }
        qux() {
          return Promise.resolve();
        }
        quz() {
          return Promise.resolve();
        }
      },
    ]
  )();
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

test('internal mixin method test', function(t) {
  t.plan(2);
  const create = mixinable(
    {
      foo: override,
      bar: override,
    },
    [
      class X {
        foo() {
          t.pass('first method is being called');
          this.bar();
        }
      },
      class X {
        bar() {
          t.pass('second method is being called');
        }
      },
    ]
  );
  create().foo();
});

test('autobinding test', function(t) {
  return new Promise(function(resolve) {
    const create = mixinable(
      {
        foo: override,
        bar: override,
      },
      [
        class X {
          foo() {
            t.pass('first method is being called');
            setTimeout(this.bar, 5);
          }
          bar() {
            t.pass('second method is being called');
            setTimeout(this.baz, 5);
          }
          baz() {
            t.pass('third method is being called');
            resolve();
          }
        },
      ]
    );
    create().foo();
  });
});
