'use strict';

var test = require('tape');
var mixinable = require('./index');

var async = mixinable.async;

test('exports test', function (t) {
  t.equal(typeof mixinable, 'function', 'main export is a function');
  t.equal(typeof mixinable.replicate, 'function', 'replicate is a function');
  t.equal(typeof mixinable.clone, 'function', 'clone is a function');
  t.equal(typeof mixinable.override, 'function', 'override is a function');
  t.equal(typeof mixinable.parallel, 'function', 'parallel is a function');
  t.equal(typeof mixinable.pipe, 'function', 'pipe is a function');
  t.equal(typeof mixinable.compose, 'function', 'compose is a function');
  t.equal(typeof async.override, 'function', 'async.override is a function');
  t.equal(typeof async.parallel, 'function', 'async.parallel is a function');
  t.equal(typeof async.pipe, 'function', 'async.pipe is a function');
  t.equal(typeof async.compose, 'function', 'async.compose is a function');
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

test('constructor support test', function (t) {
  t.plan(3);
  var arg = 1;
  mixinable()(
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

test('inheritance test', function (t) {
  t.plan(8);
  var arg = 1;
  function Implementation (_arg) {
    t.pass('implementation constructor is being called');
    t.equal(_arg, arg, 'implementation constructor receives correct arg');
    t.ok(this instanceof Implementation, 'implementation inherits correctly');
    t.ok(
      Implementation.prototype.isPrototypeOf(this),
      'implementation prototype chain is set up'
    );
  }
  Implementation.prototype = {
    foo: function (_arg) {
      t.pass('implementation is being called');
      t.equal(_arg, arg, 'implementation receives correct arg');
      t.ok(this instanceof Implementation, 'implementation inherits correctly');
      t.ok(
        Implementation.prototype.isPrototypeOf(this),
        'implementation prototype chain is set up'
      );
    }
  };
  var instance = mixinable({
    foo: function (functions, arg) {
      functions.forEach(function (fn) { fn(arg); });
    }
  })(Implementation)(arg);
  instance.foo(arg);
});

test('override helper test', function (t) {
  t.plan(2);
  var arg = 1;
  var instance = mixinable(
    {
      foo: mixinable.override
    }
  )(
    {
      foo: function (_arg) {
        t.fail('1st implementation should not be called');
      }
    },
    {
      foo: function (_arg) {
        t.fail('2nd implementation should not be called');
      }
    },
    {
      foo: function (_arg) {
        t.pass('3rd implementation is being called');
        t.equal(_arg, arg, '3rd implementation receives correct arg');
      }
    }
  )();
  instance.foo(arg);
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

test('sync compose helper test', function (t) {
  t.plan(10);
  var arg = 1;
  var instance = mixinable(
    {
      foo: mixinable.compose
    }
  )(
    {
      foo: function (ctr, _arg) {
        t.equal(ctr, 2, '1st implementation receives 2nd\'s result');
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
        t.equal(ctr, 0, '3rd implementation receives inital value');
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

test('async compose helper test', function (t) {
  t.plan(11);
  var arg = 1;
  var instance = mixinable(
    {
      foo: mixinable.compose
    }
  )(
    {
      foo: function (ctr, _arg) {
        t.equal(ctr, 2, '1st implementation receives 2nd\'s result');
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
        t.equal(ctr, 0, '3rd implementation receives inital value');
        t.equal(_arg, arg, '3rd implementation receives correct arg');
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(this.increment(ctr));
          }.bind(this), 10);
        }.bind(this));
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

test('async helper test', function (t) {
  var instance = mixinable({
    foo: async.override,
    bar: async.parallel,
    baz: async.pipe,
    qux: async.compose
  })({
    foo: function () {},
    bar: function () {},
    baz: function () {},
    qux: function () {}
  })();
  t.ok(instance.foo() instanceof Promise, 'override result is a promise');
  t.ok(instance.bar() instanceof Promise, 'parallel result is a promise');
  t.ok(instance.baz() instanceof Promise, 'pipe result is a promise');
  t.ok(instance.qux() instanceof Promise, 'compose result is a promise');
  t.end();
});

test('replicate function test', function (t) {
  t.plan(3);
  var arg1 = 1;
  var arg2 = 2;
  var create = mixinable({
    foo: mixinable.override
  })({
    constructor: function (bar) {
      this.foo = function () { return bar; };
    }
  });
  var instance = create(arg1);
  t.equal(instance.foo(), arg1, 'instance returns expected value');
  var replicate = mixinable.replicate(function (initialArgs, newArgs) {
    t.pass('handleArgs is being called');
    return [initialArgs[0] + newArgs[0]];
  });
  var replica = replicate(instance, arg2);
  t.equal(replica.foo(), arg1 + arg2, 'clone returns expected value');
});

test('clone function test', function (t) {
  var arg1 = 1;
  var arg2 = 2;
  var create = mixinable({
    foo: mixinable.override
  })({
    constructor: function (bar, baz) {
      this.foo = function () {
        return bar + (baz || 0);
      };
    }
  });
  var instance = create(arg1);
  t.equal(instance.foo(), arg1, 'instance returns expected value');
  var clone = mixinable.clone(instance, arg2);
  t.equal(clone.foo(), arg1 + arg2, 'clone returns expected value');
  t.end();
});
