'use strict';

function Mixinable () {}

Mixinable.mixin = function mixin () {
  var mixin = normalize([this.__mixin__].concat(
    argsToArray.apply(null, arguments)
  ));
  var extension = apply(mixin);
  var parent = this;
  var child = (
    extension.hasOwnProperty('constructor')
    ? extension.constructor
    : function () {
      if (!(this instanceof child)) {
        var args = argsToArray.apply(null, arguments);
        return new (child.bind.apply(child, [child].concat(args)))();
      }
      parent.apply(this, arguments);
    }
  );
  return Object.assign(child, parent, {
    __mixin__: mixin,
    __super__: parent.prototype,
    prototype: Object.assign(
      Object.create(parent.prototype),
      extension,
      {
        constructor: child
      }
    )
  });
};

module.exports = Object.assign(
  Mixinable.mixin.bind(Mixinable),
  {
    override: wrap(getLastFunction),
    parallel: wrap(function parallel () {
      var functions = filterFunctions.apply(null, arguments);
      return function runInParallel () {
        var args = argsToArray.apply(null, arguments);
        var results = functions.map(function (fn) {
          return fn.apply(this, args);
        }.bind(this));
        return (
          results.filter(isPromise).length
          ? Promise.all(results)
          : results
        );
      };
    }),
    pipe: wrap(function pipe () {
      var functions = filterFunctions.apply(null, arguments);
      return function runAsPipe () {
        var args = argsToArray.apply(null, arguments);
        return functions.reduce(
          function (result, fn) {
            if (isPromise(result)) {
              return result.then(function (value) {
                return fn.apply(this, [value].concat(args));
              }.bind(this));
            }
            return fn.apply(this, [result].concat(args));
          }.bind(this),
          args.shift()
        );
      };
    }),
    sequence: wrap(function sequence () {
      var functions = filterFunctions.apply(null, arguments);
      return function runInSequence () {
        var args = argsToArray.apply(null, arguments);
        return functions.reduce(
          function (result, fn) {
            if (isPromise(result)) {
              return result.then(fn.apply.bind(fn, this, args));
            }
            return fn.apply(this, args);
          }.bind(this),
          null
        );
      };
    })
  }
);

// mixin definition handling

function normalize (mixins) {
  return mixins.reduce(function (result, mixin) {
    if (!mixin) return result;
    return Object.keys(mixin).reduce(function (result, key) {
      result[key] = (
        result.hasOwnProperty(key)
        ? result[key]
        : {
          strategy: getLastFunction,
          implementation: []
        }
      );
      result[key].strategy = (
        isFunction(mixin[key].strategy)
        ? mixin[key].strategy
        : result[key].strategy
      );
      result[key].implementation = (
        result[key].implementation
        .concat(
          mixin[key].implementation ||
          mixin[key]
        )
        .filter(isFunction)
      );
      return result;
    }, result);
  }, {});
}

function apply (mixin) {
  return Object.keys(mixin).reduce(function (result, key) {
    var definition = mixin[key];
    result[key] = definition.strategy.apply(
      null,
      definition.implementation
    );
    return result;
  }, {});
}

function wrap (strategy) {
  return function () {
    return {
      strategy: strategy,
      implementation: argsToArray.apply(null, arguments)
    };
  };
}

// helpers

function argsToArray () {
  var args = new Array(arguments.length);
  for (var i = 0; i < args.length; ++i) {
    args[i] = arguments[i];
  }
  return args;
}

function getLastFunction () {
  return filterFunctions.apply(null, arguments).pop();
}

function filterFunctions () {
  return argsToArray.apply(null, arguments).filter(isFunction);
}

function isFunction (obj) {
  return typeof obj === 'function';
}

function isPromise (obj) {
  return obj instanceof Promise;
}
