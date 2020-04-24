export function define(strategies, mixins) {
  class Mixinable {
    constructor(...args) {
      var mixinstances = (mixins || []).map((Mixin) => {
        return new Mixin(...args);
      });
      Object.keys(strategies || {}).forEach((method) => {
        this[method] = strategies[method].bind(
          this,
          mixinstances.reduce((functions, mixinstance) => {
            if (isFunction(mixinstance[method])) {
              functions.push(mixinstance[method].bind(mixinstance));
            }
            return functions;
          }, [])
        );
        mixinstances.forEach((mixinstance) => {
          mixinstance[method] = this[method];
        });
      });
    }
  }

  return function createMixinable(...args) {
    return new Mixinable(...args);
  };
}

export function override(functions, ...args) {
  var fn = functions.slice().pop();
  if (isFunction(fn)) {
    return fn(...args);
  }
}

export { override as callable };

export function parallel(functions, ...args) {
  var results = functions.map((fn) => {
    return fn(...args);
  });
  return results.find(isPromise) ? Promise.all(results) : results;
}

export function pipe(functions, initial, ...args) {
  return functions.reduce((result, fn) => {
    if (isPromise(result)) {
      return result.then((result) => {
        return fn(result, ...args);
      });
    }
    return fn(result, ...args);
  }, initial);
}

export function compose(functions, ...args) {
  return exports.pipe(functions.slice().reverse(), ...args);
}

export const async = {
  callable: function callableAsync(...args) {
    return asynchronize(exports.override)(...args);
  },
  override: function overrideAsync(...args) {
    return asynchronize(exports.override)(...args);
  },
  parallel: function parallelAsync(...args) {
    return asynchronize(exports.parallel)(...args);
  },
  pipe: function pipeAsync(...args) {
    return asynchronize(exports.pipe)(...args);
  },
  compose: function composeAsync(...args) {
    return asynchronize(exports.compose)(...args);
  },
};

export const sync = {
  callable: function callableSync(...args) {
    return synchronize(exports.override)(...args);
  },
  override: function overrideSync(...args) {
    return synchronize(exports.override)(...args);
  },
  sequence: function sequenceSync(...args) {
    return synchronize(exports.parallel)(...args);
  },
  parallel: function parallelSync(...args) {
    return synchronize(exports.parallel)(...args);
  },
  pipe: function pipeSync(...args) {
    return synchronize(exports.pipe)(...args);
  },
  compose: function composeSync(...args) {
    return synchronize(exports.compose)(...args);
  },
};

// utilities

function isFunction(obj) {
  return typeof obj === 'function';
}

function isPromise(obj) {
  return obj && isFunction(obj.then) && obj instanceof Promise;
}

function asynchronize(fn) {
  return function asyncFn(...args) {
    var obj = fn(...args);
    return isPromise(obj) ? obj : Promise.resolve(obj);
  };
}

function synchronize(fn) {
  return function syncFn(...args) {
    var obj = fn(...args);
    if (isPromise(obj)) {
      throw new Error('got promise in sync mode');
    }
    return obj;
  };
}
