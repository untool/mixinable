'use strict';

// main export

module.exports = exports = function define(strategies) {
  return function mixin() {
    var mixins = argsToArray(arguments).map(createMixin);
    return createMixinable(strategies, mixins);
  };
};

// strategy exports

exports.callable = exports.override = function override(functions) {
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
  callable: asynchronize(exports.callable),
  override: asynchronize(exports.override),
  parallel: asynchronize(exports.parallel),
  pipe: asynchronize(exports.pipe),
  compose: asynchronize(exports.compose),
};

exports.sync = {
  callable: asynchronize(exports.callable),
  override: synchronize(exports.override),
  sequence: synchronize(exports.parallel),
  parallel: synchronize(exports.parallel),
  pipe: synchronize(exports.pipe),
  compose: synchronize(exports.compose),
};

// core functions

function createMixin(definition) {
  if (isFunction(definition)) {
    return definition;
  }
  function Mixin() {
    getConstructor(definition).apply(this, arguments);
  }
  Mixin.prototype = Object.create(getPrototype(definition));
  Mixin.prototype.constructor = Mixin;
  return Mixin;
}

function createMixinable(strategies, mixins) {
  function Mixinable() {
    var args = argsToArray(arguments);
    if (!(this instanceof Mixinable)) {
      return new (bindArgs(Mixinable, args))();
    }
    getConstructor(strategies).apply(this, args);
    bootstrapMixinable(
      this,
      mixins.map(function(Mixin) {
        return new (bindArgs(Mixin, args))();
      })
    );
  }
  Mixinable.prototype = Object.create(getPrototype(strategies));
  Mixinable.prototype.constructor = Mixinable;
  return Mixinable;
}

function bootstrapMixinable(mixinable, mixinstances) {
  mixinstances.forEach(bindMethods);
  getMethodNames(mixinable).forEach(function(method) {
    mixinable[method] = mixinable[method].bind(
      mixinable,
      mixinstances.reduce(function(functions, mixinstance) {
        if (isFunction(mixinstance[method])) {
          functions.push(mixinstance[method]);
        }
        return functions;
      }, [])
    );
    mixinstances.forEach(function(mixinstance) {
      mixinstance[method] = mixinable[method];
    });
  });
}

// classy helpers

function getConstructor(obj) {
  if (isFunction(obj)) {
    return obj;
  }
  if (obj && obj.hasOwnProperty('constructor')) {
    return obj.constructor;
  }
  return function() {};
}

function getPrototype(obj) {
  if (isFunction(obj) && obj.hasOwnProperty('prototype')) {
    return obj.prototype;
  }
  return obj || Object.create(null);
}

function bindMethods(obj) {
  getMethodNames(obj).forEach(function(method) {
    obj[method] = obj[method].bind(obj);
  });
  return obj;
}

function getMethodNames(obj) {
  return getPropertyNames(obj).filter(function(prop) {
    return prop !== 'constructor' && typeof obj[prop] === 'function';
  });
}

function getPropertyNames(obj) {
  var props = [];
  do {
    Object.getOwnPropertyNames(obj || {}).forEach(function(prop) {
      if (props.indexOf(prop) === -1) {
        props.push(prop);
      }
    });
  } while ((obj = Object.getPrototypeOf(obj || {})) !== Object.prototype);
  return props;
}

// utilities

var argsToArray = Function.prototype.apply.bind(function argsToArray() {
  var args = new Array(arguments.length);
  for (var i = 0; i < arguments.length; ++i) {
    args[i] = arguments[i];
  }
  return args;
}, null);

function bindArgs(fn, args) {
  return Function.prototype.bind.apply(fn, [fn].concat(args));
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
