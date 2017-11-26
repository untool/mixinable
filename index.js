'use strict';

module.exports = exports = function define (definition) {
  var mixinable = createMixinable(definition);
  return function mixin () {
    var mixins = argsToArray(arguments).map(createMixin);
    return function create () {
      var args = argsToArray(arguments);
      return Object.defineProperties(
        new (bindArgs(mixinable, args))(),
        {
          __implementations__: { value: getImplementations(
            mixinable,
            mixins.map(function (mixin) {
              return new (bindArgs(mixin, args))();
            })
          )},
          __clone__: { value: bindArgs(create, args) }
        }
      );
    };
  };
};

// strategy exports

exports.override = function override (functions) {
  var args = argsToArray(arguments).slice(1);
  var fn = functions[functions.length - 1];
  if (isFunction(fn)) {
    return fn.apply(null, args);
  }
};

exports.parallel = function parallel (functions) {
  var args = argsToArray(arguments).slice(1);
  var results = functions.map(function (fn) {
    return fn.apply(null, args);
  });
  return (
    results.filter(isPromise).length
    ? Promise.all(results)
    : results
  );
};

exports.pipe = function pipe (functions) {
  var args = argsToArray(arguments).slice(1);
  return functions.reduce(
    function (result, fn) {
      if (isPromise(result)) {
        return result.then(function (value) {
          return fn.apply(null, [value].concat(args));
        });
      }
      return fn.apply(null, [result].concat(args));
    },
    args.shift()
  );
};

exports.compose = function compose (_functions) {
  var args = argsToArray(arguments).slice(1);
  var functions = [].concat(_functions).reverse();
  return exports.pipe.apply(null, [functions].concat(args));
};

// utility exports

exports.clone = function clone (instance) {
  var args = argsToArray(arguments).slice(1);
  if (instance && isFunction(instance.__clone__)) {
    return instance.__clone__.apply(null, args);
  }
};

// classy helpers

function createMixinable (definition) {
  function Mixinable () {
    getConstructor(definition).apply(this, arguments);
  }
  var prototype = getPrototype(definition);
  Mixinable.prototype = Object.assign(
    Object.create(prototype),
    Object.keys(prototype).reduce(function (result, key) {
      result[key] = function () {
        var args = argsToArray(arguments);
        var functions = this.__implementations__[key];
        var strategy = prototype[key];
        return strategy.apply(this, [functions].concat(args));
      };
      return result;
    }, {}),
    { constructor: Mixinable }
  );
  return Mixinable;
}

function createMixin (definition) {
  if (isFunction(definition)) {
    return definition;
  }
  function Mixin () {
    getConstructor(definition).apply(this, arguments);
  }
  Mixin.prototype = Object.assign(
    Object.create(getPrototype(definition)),
    { constructor: Mixin }
  );
  return Mixin;
}

function getImplementations (mixinable, mixinstances) {
  return Object.keys(mixinable.prototype).reduce(function (result, key) {
    result[key] = mixinstances
      .filter(function (mixinstance) {
        return isFunction(mixinstance[key]);
      })
      .map(function (mixinstance) {
        return mixinstance[key].bind(mixinstance);
      });
    return result;
  }, {});
}

// utilities

var argsToArray = Function.prototype.apply.bind(
  function argsToArray () {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
      args[i] = arguments[i];
    }
    return args;
  },
  null
);

function bindArgs (fn, args) {
  return Function.prototype.bind.apply(fn, [fn].concat(args));
}

function getConstructor (obj) {
  if (isFunction(obj)) {
    return obj;
  }
  if (obj && obj.hasOwnProperty('constructor')) {
    return obj.constructor;
  }
  return function () {};
}

function getPrototype (obj) {
  if (isFunction(obj)) {
    return obj.prototype;
  }
  return obj || Object.create(null);
}

function isFunction (obj) {
  return typeof obj === 'function';
}

function isPromise (obj) {
  return obj instanceof Promise;
}
