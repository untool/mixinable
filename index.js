'use strict';

// main export

module.exports = exports = function define(strategies) {
  return function mixin() {
    return createMixinable(strategies, argsToArray(arguments).map(createMixin));
  };
};

// strategy exports

exports.override = function override(functions) {
  var args = argsToArray(arguments).slice(1);
  var fn = functions[functions.length - 1];
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
      return result.then(function(value) {
        return fn.apply(null, [value].concat(args));
      });
    }
    return fn.apply(null, [result].concat(args));
  }, args.shift());
};

exports.compose = function compose(_functions) {
  var args = argsToArray(arguments).slice(1);
  var functions = [].concat(_functions).reverse();
  return exports.pipe.apply(null, [functions].concat(args));
};

// utility exports

exports.async = {
  override: function overrideAsync() {
    return ensureAsync(exports.override.apply(null, arguments));
  },
  parallel: function parallelAsync() {
    return ensureAsync(exports.parallel.apply(null, arguments));
  },
  pipe: function pipeAsync() {
    return ensureAsync(exports.pipe.apply(null, arguments));
  },
  compose: function composeAsync() {
    return ensureAsync(exports.compose.apply(null, arguments));
  },
};

exports.sync = {
  override: function overrideSync() {
    return ensureSync(exports.override.apply(null, arguments));
  },
  sequence: function sequenceSync() {
    return ensureSync(exports.parallel.apply(null, arguments));
  },
  parallel: function parallelSync() {
    return ensureSync(exports.parallel.apply(null, arguments));
  },
  pipe: function pipeSync() {
    return ensureSync(exports.pipe.apply(null, arguments));
  },
  compose: function composeSync() {
    return ensureSync(exports.compose.apply(null, arguments));
  },
};

// classy helpers

function createMixinable(strategies, mixins) {
  var constructor = getConstructor(strategies);
  var prototype = getPrototype(strategies);
  function Mixinable() {
    var args = argsToArray(arguments);
    if (!(this instanceof Mixinable)) {
      return new (bindArgs(Mixinable, args))();
    }
    var mixinstances = mixins.map(function(mixin) {
      return bindMethods(new (bindArgs(mixin, args))());
    });
    enhanceMixinable(this, mixinstances, prototype);
    enhanceMixinstances(this, mixinstances, prototype);
    constructor.apply(this, args);
  }
  Mixinable.prototype = Object.create(prototype);
  Mixinable.prototype.constructor = Mixinable;
  return Mixinable;
}

function enhanceMixinable(mixinable, mixinstances, strategies) {
  var keys = Object.keys(strategies).filter(function(key) {
    return key !== 'constructor';
  });
  var implementations = keys.reduce(function(result, key) {
    result[key] = mixinstances
      .filter(function(mixinstance) {
        return isFunction(mixinstance[key]);
      })
      .map(function(mixinstance) {
        return mixinstance[key];
      });
    return result;
  }, {});
  keys.forEach(function(key) {
    mixinable[key] = function() {
      var args = argsToArray(arguments);
      return strategies[key].apply(
        mixinable,
        [implementations[key]].concat(args)
      );
    };
  });
}

function enhanceMixinstances(mixinable, mixinstances, strategies) {
  Object.keys(strategies)
    .filter(function(key) {
      return key !== 'constructor';
    })
    .forEach(function(key) {
      mixinstances.forEach(function(mixinstance) {
        mixinstance[key] = mixinable[key];
      });
    });
}

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

function ensureAsync(obj) {
  return isPromise(obj) ? obj : Promise.resolve(obj);
}

function ensureSync(obj) {
  if (isPromise(obj)) {
    throw new Error('got promise in sync mode');
  }
  return obj;
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
    obj &&
      Object.getOwnPropertyNames(obj).forEach(function(prop) {
        if (props.indexOf(prop) === -1) {
          props.push(prop);
        }
      });
  } while (obj && (obj = Object.getPrototypeOf(obj)) !== Object.prototype);
  return props;
}
