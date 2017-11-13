'use strict';

var test = require('tape');
var mixinable = require('./index');

test('exports test', function (t) {
  t.equal(typeof mixinable, 'function', 'main export is a function');
  t.equal(typeof mixinable.parallel, 'function', 'parallel is a function');
  t.equal(typeof mixinable.pipe, 'function', 'pipe is a function');
  t.end();
});

test('basic function test', function (t) {
  var mixin = mixinable();
  t.equal(typeof mixin, 'function', 'mixinable creates a mixin function');
  var create = mixin();
  t.equal(typeof create, 'function', 'mixin creates a create function');
  var result = create();
  t.ok(result, 'create returns something');
  t.end();
});

test('clone function test', function (t) {
  var arg1 = 1;
  var arg2 = 2;
  var create = mixinable({
    constructor: function (bar, baz) {
      this.bar = bar;
      this.baz = baz;
    }
  })();
  var instance = create(arg1);
  t.equal(instance.bar, arg1, 'instance has expected 1st property');
  t.equal(instance.baz, undefined, 'instance does not have 2nd property');
  var clone = instance.clone(arg2);
  t.equal(clone.bar, arg1, 'clone has expected 1st property');
  t.equal(clone.baz, arg2, 'clone has expected 2nd property');
  t.end();
});

test('constructor support test', function (t) {
  t.plan(4);
  var arg = 1;
  mixinable(
    {
      constructor: function (_arg) {
        t.equal(_arg, arg, 'facade receives correct arg');
      }
    }
  )(
    {
      constructor: function (_arg) {
        t.equal(_arg, arg, '1st implementation receives correct arg');
      }
    },
    {
      constructor: function (_arg) {
        t.equal(_arg, arg, '2nd implementation receives correct arg');
      }
    },
    {
      constructor: function (_arg) {
        t.equal(_arg, arg, '3rd implementation receives correct arg');
      }
    }
  )(arg);
});

test('sync parallel helper test', function (t) {
  t.plan(9);
  var arg = 1;
  var ctr = 0;
  var instance = mixinable(
    {
      foo: mixinable.parallel
    }
  )(
    {
      foo: function (_arg) {
        t.equal(_arg, arg, '1st implementation receives correct arg');
        t.equal(ctr, 0, '1st implementation is being called first');
        this.increment();
      },
      increment: function () {
        t.pass('1st private method is being called');
        ++ctr;
      }
    },
    {
      foo: function (_arg) {
        t.equal(_arg, arg, '2nd implementation receives correct arg');
        t.equal(ctr, 1, '2nd implementation is being called second');
        this.increment();
      },
      increment: function () {
        t.pass('2nd private method is being called');
        ++ctr;
      }
    },
    {
      foo: function (_arg) {
        t.equal(_arg, arg, '3rd implementation receives correct arg');
        t.equal(ctr, 2, '3rd implementation is being called third');
        this.increment();
      },
      increment: function () {
        t.pass('3rd private method is being called');
        ++ctr;
      }
    }
  )();
  instance.foo(arg);
});

test('async parallel helper test', function (t) {
  t.plan(14);
  var arg = 1;
  var ctr = 0;
  var instance = mixinable(
    {
      foo: mixinable.parallel
    }
  )(
    {
      foo: function (_arg) {
        t.equal(_arg, arg, '1st implementation receives correct arg');
        t.equal(ctr, 0, '1st implementation is being called instantaneously');
        return new Promise(function (resolve) {
          setTimeout(function () {
            this.increment();
            resolve(ctr);
          }.bind(this), 10);
        }.bind(this));
      },
      increment: function () {
        t.pass('1st private method is being called');
        ++ctr;
      }
    },
    {
      foo: function (_arg) {
        t.equal(_arg, arg, '2nd implementation receives correct arg');
        t.equal(ctr, 0, '2nd implementation is being called instantaneously');
        return new Promise(function (resolve) {
          setTimeout(function () {
            this.increment();
            resolve(ctr);
          }.bind(this), 5);
        }.bind(this));
      },
      increment: function () {
        t.pass('2nd private method is being called');
        ++ctr;
      }
    },
    {
      foo: function (_arg) {
        t.equal(_arg, arg, '3rd implementation receives correct arg');
        t.equal(ctr, 0, '3rd implementation is being called instantaneously');
        this.increment();
        return ctr;
      },
      increment: function () {
        t.pass('3rd private method is being called');
        ++ctr;
      }
    }
  )();
  var result = instance.foo(arg);
  t.ok(result instanceof Promise, 'received result is a promise');
  result.then(function (result) {
    t.equal(result.length, 3, 'promise resolves to array with correct length');
    t.equal(result[0], 3, '1st result has correct value');
    t.equal(result[1], 2, '2nd result has correct value');
    t.equal(result[2], 1, '3rd result has correct value');
  });
});

test('sync pipe helper test', function (t) {
  t.plan(10);
  var arg = 1;
  var instance = mixinable(
    {
      foo: mixinable.pipe
    }
  )(
    {
      foo: function (ctr, _arg) {
        t.equal(ctr, 0, '1st implementation receives inital value');
        t.equal(_arg, arg, '1st implementation receives correct arg');
        return this.increment(ctr);
      },
      increment: function (ctr) {
        t.pass('1st private method is being called');
        return ++ctr;
      }
    },
    {
      foo: function (ctr, _arg) {
        t.equal(ctr, 1, '2nd implementation receives 1st\'s result');
        t.equal(_arg, arg, '2nd implementation receives correct arg');
        return this.increment(ctr);
      },
      increment: function (ctr) {
        t.pass('2nd private method is being called');
        return ++ctr;
      }
    },
    {
      foo: function (ctr, _arg) {
        t.equal(ctr, 2, '3rd implementation receives 2nd\'s result');
        t.equal(_arg, arg, '3rd implementation receives correct arg');
        return this.increment(ctr);
      },
      increment: function (ctr) {
        t.pass('3rd private method is being called');
        return ++ctr;
      }
    }
  )();
  t.equal(instance.foo(0, arg), 3, 'correct result received');
});

test('async pipe helper test', function (t) {
  t.plan(11);
  var arg = 1;
  var instance = mixinable(
    {
      foo: mixinable.pipe
    }
  )(
    {
      foo: function (ctr, _arg) {
        t.equal(ctr, 0, '1st implementation receives inital value');
        t.equal(_arg, arg, '1st implementation receives correct arg');
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(this.increment(ctr));
          }.bind(this), 10);
        }.bind(this));
      },
      increment: function (ctr) {
        t.pass('1st private method is being called');
        return ++ctr;
      }
    },
    {
      foo: function (ctr, _arg) {
        t.equal(ctr, 1, '2nd implementation receives 1st\'s result');
        t.equal(_arg, arg, '2nd implementation receives correct arg');
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(this.increment(ctr));
          }.bind(this), 5);
        }.bind(this));
      },
      increment: function (ctr) {
        t.pass('2nd private method is being called');
        return ++ctr;
      }
    },
    {
      foo: function (ctr, _arg) {
        t.equal(ctr, 2, '3rd implementation receives 2nd\'s result');
        t.equal(_arg, arg, '3rd implementation receives correct arg');
        return this.increment(ctr);
      },
      increment: function (ctr) {
        t.pass('3rd private method is being called');
        return ++ctr;
      }
    }
  )();
  var result = instance.foo(0, arg);
  t.ok(result instanceof Promise, 'received result is a promise');
  result.then(function (result) {
    t.equal(result, 3, 'promise resolves to correct value');
  });
});
