'use strict';

module.exports = exports = function define (definition) {
  var keys = Object.keys(definition || {}).filter(function (key) {
    return isFunction(definition[key]);
  });
  var mixinable = createClass(
    keys.reduce(function (result, key) {
      if (key === 'constructor') {
        result[key] = definition[key];
      } else {
        result[key] = function () {
          var args = argsToArray.apply(null, arguments);
          var functions = this.__implementations__[key];
          return definition[key].apply(this, [functions].concat(args));
        };
      }
      return result;
    }, {})
  );
  return function mixin () {
    var mixins = argsToArray.apply(null, arguments).map(createClass);
    return function create () {
      var args = argsToArray.apply(null, arguments);
      var mixinstances = mixins.map(function (mixin) {
        return new (mixin.bind.apply(mixin, [mixin].concat(args)))();
      });
      return Object.defineProperty(
        new (mixinable.bind.apply(mixinable, [mixinable].concat(args)))(),
        '__implementations__',
        {
          value: keys.reduce(function (result, key) {
            result[key] = mixinstances
              .filter(function (mixinstance) {
                return isFunction(mixinstance[key]);
              })
              .map(function (mixinstance) {
                return mixinstance[key].bind(mixinstance);
              });
            return result;
          }, {})
        }
      );
    };
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

function createClass (_prototype) {
  var prototype = Object.assign({}, _prototype);
  var constructor = function () {};
  if (prototype.hasOwnProperty('constructor')) {
    constructor = prototype.constructor;
  } else {
    prototype.constructor = constructor;
  }
  constructor.prototype = prototype;
  return constructor;
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
