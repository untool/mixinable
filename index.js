'use strict';

// main export

module.exports = exports = function define(strategies) {
  return function mixin() {
    return createMixinable(
      strategies || {},
      argsToArray(arguments).map(createMixin)
    );
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
  return results.filter(isPromise).length ? Promise.all(results) : results;
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

exports.isMixinable = function isMixinable(obj) {
  return obj && '__implementations__' in obj && '__arguments__' in obj;
};

exports.replicate = function replicate(handleArgs) {
  return function(instance) {
    if (instance) {
      return new (bindArgs(
        instance.constructor,
        handleArgs(
          instance.__arguments__ || [],
          argsToArray(arguments).slice(1)
        )
      ))();
    }
  };
};

exports.clone = exports.replicate(Array.prototype.concat.bind([]));

// classy helpers

function createMixinable(strategies, mixins) {
  var constructor = getConstructor(strategies);
  var prototype = getPrototype(strategies);
  function Mixinable() {
    var args = argsToArray(arguments);
    if (!(this instanceof Mixinable)) {
      return new (bindArgs(Mixinable, args))();
    }
    enhanceInstance(this, prototype, mixins, args);
    constructor.apply(this, args);
    bindAll(this);
  }
  Mixinable.prototype = Object.assign(
    Object.create(prototype),
    enhancePrototype(prototype),
    { constructor: Mixinable }
  );
  return Mixinable;
}

function enhanceInstance(mixinable, strategies, mixins, args) {
  var mixinstances = mixins.map(function(mixin) {
    return bindAll(new (bindArgs(mixin, args))());
  });
  var mixinstanceProps = Object.keys(strategies).reduce(function(result, key) {
    result[key] = { value: mixinable[key].bind(mixinable) };
    return result;
  }, {});
  var mixinableProps = {
    __implementations__: {
      value: Object.keys(strategies).reduce(function(result, key) {
        result[key] = mixinstances
          .filter(function(mixinstance) {
            return isFunction(mixinstance[key]);
          })
          .map(function(mixinstance) {
            return mixinstance[key].bind(mixinstance);
          });
        return result;
      }, {}),
    },
    __arguments__: { value: args },
  };
  mixinstances.forEach(function(mixinstance) {
    Object.defineProperties(mixinstance, mixinstanceProps);
  });
  Object.defineProperties(mixinable, mixinableProps);
}

function enhancePrototype(strategies) {
  return Object.keys(strategies).reduce(function(result, key) {
    result[key] = function() {
      var args = argsToArray(arguments);
      var functions = this.__implementations__[key];
      var strategy = strategies[key];
      return strategy.apply(this, [functions].concat(args));
    };
    return result;
  }, {});
}

function createMixin(definition) {
  if (isFunction(definition)) {
    return definition;
  }
  function Mixin() {
    getConstructor(definition).apply(this, arguments);
  }
  Mixin.prototype = Object.assign(Object.create(getPrototype(definition)), {
    constructor: Mixin,
  });
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
  if (isFunction(obj)) {
    return obj.prototype;
  }
  return obj || Object.create(null);
}

// utilities

var argsToArray = Function.prototype.apply.bind(function argsToArray() {
  var args = new Array(arguments.length);
  for (var i = 0; i < args.length; ++i) {
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
  return obj instanceof Promise;
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

function getPropertyNames(obj) {
  var props = [];
  do {
    Object.getOwnPropertyNames(obj).forEach(function(prop) {
      if (props.indexOf(prop) === -1) {
        props.push(prop);
      }
    });
  } while ((obj = Object.getPrototypeOf(obj)) !== Object.prototype);
  return props;
}

function getMethodNames(obj) {
  return getPropertyNames(obj).filter(function(prop) {
    return prop !== 'constructor' && typeof obj[prop] === 'function';
  });
}

function bindAll(obj) {
  getMethodNames(obj).forEach(function(method) {
    obj[method] = obj[method].bind(obj);
  });
  return obj;
}
