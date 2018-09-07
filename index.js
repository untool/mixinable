'use strict';

// main export

module.exports = exports = function define(strategies, mixins) {
  return function Mixinable() {
    var args = argsToArray(arguments);
    if (!(this instanceof Mixinable)) {
      return new (bindArgs(Mixinable, args))();
    }
    var mixinstances = (mixins || []).map(function(Mixin) {
      return new (bindArgs(Mixin, args))();
    });
    var intercept = instrument(this);
    Object.keys(strategies || {}).forEach(function(method) {
      var functions = mixinstances.reduce(function(functions, mixinstance) {
        if (isFunction(mixinstance[method])) {
          functions.push(mixinstance[method].bind(mixinstance));
        }
        return functions;
      }, []);
      this[method] = intercept(
        method,
        strategies[method].bind(this, functions)
      );
      mixinstances.forEach(function(mixinstance) {
        mixinstance[method] = this[method];
      }, this);
    }, this);
  };
};

// strategy exports

exports.override = exports.callable = function override(functions) {
  var args = argsToArray(arguments).slice(1);
  var fn = functions.slice().pop();
  if (isFunction(fn)) {
    return fn.apply(null, args);
  }
};

exports.parallel = function parallel(functions) {
  var args = argsToArray(arguments).slice(1);
  var results = functions.map(function(fn) {
    return fn.apply(null, args);
  });
  return results.find(isPromise) ? Promise.all(results) : results;
};

exports.pipe = function pipe(functions) {
  var args = argsToArray(arguments).slice(1);
  return functions.reduce(function(result, fn) {
    if (isPromise(result)) {
      return result.then(function(result) {
        return fn.apply(null, [result].concat(args));
      });
    }
    return fn.apply(null, [result].concat(args));
  }, args.shift());
};

exports.compose = function compose(functions) {
  var args = argsToArray(arguments).slice(1);
  var fn = exports.pipe.bind(this, functions.slice().reverse());
  return fn.apply(null, args);
};

exports.async = {
  callable: function callableAsync() {
    return asynchronize(exports.override).apply(this, arguments);
  },
  override: function overrideAsync() {
    return asynchronize(exports.override).apply(this, arguments);
  },
  parallel: function parallelAsync() {
    return asynchronize(exports.parallel).apply(this, arguments);
  },
  pipe: function pipeAsync() {
    return asynchronize(exports.pipe).apply(this, arguments);
  },
  compose: function composeAsync() {
    return asynchronize(exports.compose).apply(this, arguments);
  },
};

exports.sync = {
  callable: function callableSync() {
    return synchronize(exports.override).apply(this, arguments);
  },
  override: function overrideSync() {
    return synchronize(exports.override).apply(this, arguments);
  },
  sequence: function sequenceSync() {
    return synchronize(exports.parallel).apply(this, arguments);
  },
  parallel: function parallelSync() {
    return synchronize(exports.parallel).apply(this, arguments);
  },
  pipe: function pipeSync() {
    return synchronize(exports.pipe).apply(this, arguments);
  },
  compose: function composeSync() {
    return synchronize(exports.compose).apply(this, arguments);
  },
};

// utilities

var argsToArray = Function.prototype.apply.bind(function argsToArray() {
  var args = new Array(arguments.length);
  for (var i = 0; i < arguments.length; ++i) {
    args[i] = arguments[i];
  }
  return args;
}, null);

function bindArgs(fn, args) {
  return Function.prototype.bind.apply(fn, [null].concat(args));
}

function isFunction(obj) {
  return typeof obj === 'function';
}

function isPromise(obj) {
  return obj && isFunction(obj.then) && obj instanceof Promise;
}

function asynchronize(fn) {
  return function asyncFn() {
    var obj = fn.apply(null, arguments);
    return isPromise(obj) ? obj : Promise.resolve(obj);
  };
}

function synchronize(fn) {
  return function syncFn() {
    var obj = fn.apply(null, arguments);
    if (isPromise(obj)) {
      throw new Error('got promise in sync mode');
    }
    return obj;
  };
}

// instrumentation

function instrument(mixinable) {
  var queues = {};
  mixinable.events = {
    on: function on(topic, fn) {
      if (!queues[topic]) {
        queues[topic] = [];
      }
      queues[topic].push(fn);
    },
    off: function(topic, fn) {
      if (queues[topic]) {
        queues[topic].splice(queues[topic].indexOf(fn), 1);
      }
    },
  };
  return function intercept(method, implementation) {
    function emit(suffix) {
      var args = argsToArray(arguments).slice(1);
      var topic = [method, suffix].join(':');
      if (queues[topic]) {
        queues[topic].slice().forEach(function(fn) {
          fn.apply(null, args);
        });
      }
    }
    function onFulfilled(value) {
      emit('success', value), emit('finish');
      return value;
    }
    function onRejected(error) {
      emit('error', error), emit('finish');
      throw error;
    }
    function execute() {
      var args = argsToArray(arguments);
      emit('start', args);
      try {
        var result = implementation.apply(null, args);
        if (isPromise(result)) {
          return result.then(onFulfilled, onRejected);
        } else {
          return onFulfilled(result);
        }
      } catch (error) {
        onRejected(error);
      }
    }
    try {
      return Object.defineProperty(execute, 'name', {
        value: implementation.name,
        writable: true,
      });
    } catch (_) {
      return execute;
    }
  };
}
