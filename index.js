'use strict';

module.exports = exports = function define (definition) {
  var methodNames = getMethodNames(definition);
  var mixinable = createMixinable(definition, methodNames);
  return function mixin () {
    var definitions = argsToArray.apply(null, arguments);
    var mixins = definitions.map(createClass);
    return Object.defineProperties(
      function create () {
        var args = argsToArray.apply(null, arguments);
        var mixinstances = mixins.map(function (mixin) {
          return new (mixin.bind.apply(mixin, [mixin].concat(args)))();
        });
        return Object.defineProperties(
          new (mixinable.bind.apply(mixinable, [mixinable].concat(args)))(),
          {
            __implementations__: {
              value: getImplementations(mixinstances, methodNames)
            },
            clone: {
              value: create.bind.apply(create, [create].concat(args))
            }
          }
        );
      },
      {
        mixin: {
          value: mixin.bind.apply(mixin, [mixin].concat(definitions))
        }
      }
    );
  };
};

exports.parallel = function parallel (functions) {
  var args = argsToArray.apply(null, arguments).slice(1);
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
  var args = argsToArray.apply(null, arguments).slice(1);
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

function createMixinable (definition, methodNames) {
  return createClass(
    methodNames.reduce(function (result, methodName) {
      if (methodName === 'constructor') {
        result[methodName] = definition[methodName];
      } else {
        result[methodName] = function () {
          var args = argsToArray.apply(null, arguments);
          var functions = this.__implementations__[methodName];
          return definition[methodName].apply(this, [functions].concat(args));
        };
      }
      return result;
    }, {})
  );
}

function createClass (prototype) {
  var constructor = function () {};
  if (prototype.hasOwnProperty('constructor')) {
    constructor = prototype.constructor;
  } else {
    prototype.constructor = constructor;
  }
  constructor.prototype = prototype;
  return constructor;
}

function getMethodNames (definition) {
  return Object.keys(definition || {})
    .filter(function (methodName) {
      return isFunction(definition[methodName]);
    });
}

function getImplementations (mixinstances, methodNames) {
  return methodNames.reduce(function (result, methodName) {
    result[methodName] = mixinstances
      .filter(function (mixinstance) {
        return isFunction(mixinstance[methodName]);
      })
      .map(function (mixinstance) {
        return mixinstance[methodName].bind(mixinstance);
      });
    return result;
  }, {});
}

function argsToArray () {
  var args = new Array(arguments.length);
  for (var i = 0; i < args.length; ++i) {
    args[i] = arguments[i];
  }
  return args;
}

function isFunction (obj) {
  return typeof obj === 'function';
}

function isPromise (obj) {
  return obj instanceof Promise;
}
