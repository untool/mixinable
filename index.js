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
    Object.keys(strategies || {}).forEach(function(method) {
      this[method] = strategies[method].bind(
        this,
        mixinstances.reduce(function(functions, mixinstance) {
          if (isFunction(mixinstance[method])) {
            functions.push(mixinstance[method].bind(mixinstance));
          }
          return functions;
        }, [])
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
  var fn = exports.pipe.bind(null, functions.slice().reverse());
  return fn.apply(null, args);
};

exports.async = {
  callable: function callableAsync() {
    return asynchronize(exports.override).apply(null, arguments);
  },
  override: function overrideAsync() {
    return asynchronize(exports.override).apply(null, arguments);
  },
  parallel: function parallelAsync() {
    return asynchronize(exports.parallel).apply(null, arguments);
  },
  pipe: function pipeAsync() {
    return asynchronize(exports.pipe).apply(null, arguments);
  },
  compose: function composeAsync() {
    return asynchronize(exports.compose).apply(null, arguments);
  },
};

exports.sync = {
  callable: function callableSync() {
    return synchronize(exports.override).apply(null, arguments);
  },
  override: function overrideSync() {
    return synchronize(exports.override).apply(null, arguments);
  },
  sequence: function sequenceSync() {
    return synchronize(exports.parallel).apply(null, arguments);
  },
  parallel: function parallelSync() {
    return synchronize(exports.parallel).apply(null, arguments);
  },
  pipe: function pipeSync() {
    return synchronize(exports.pipe).apply(null, arguments);
  },
  compose: function composeSync() {
    return synchronize(exports.compose).apply(null, arguments);
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
