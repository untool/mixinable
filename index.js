'use strict';

/**
 * @typedef {{
 * [key: string]: (...args: any[]) => any;
 * }} StrategiesObject
 *
 * @typedef {{
 * new (...args: any[]): any;
 * [name: string]: any;
 * }} MixinClass
 */

/**
 * @typedef {{
 * <
 *   S extends StrategiesObject,
 *   M1 extends MixinClass,
 *   M2 extends MixinClass,
 *   M3 extends MixinClass,
 *   P extends {
 *     [key in K]: (
 *       ...args: Parameters<(M1 & M2 & M3)['prototype'][key]>
 *     ) => ReturnType<S[key]>;
 *   },
 *   K extends string = Extract<keyof S, string>
 * >(
 *   strategies?: S,
 *   mixins?: [M1, M2, M3]
 * ): (...args: ConstructorParameters<M1 & M2 & M3>) => P;
 * <
 *   S extends StrategiesObject,
 *   M1 extends MixinClass,
 *   M2 extends MixinClass,
 *   P extends {
 *     [key in K]: (
 *       ...args: Parameters<(M1 & M2)['prototype'][key]>
 *     ) => ReturnType<S[key]>;
 *   },
 *   K extends string = Extract<keyof S, string>
 * >(
 *   strategies?: S,
 *   mixins?: [M1, M2]
 * ): (...args: ConstructorParameters<M1 & M2>) => P;
 * <
 *  S extends StrategiesObject,
 *  M1 extends MixinClass,
 *  P extends {
 *    [key in K]: (
 *      ...args: Parameters<M1['prototype'][key]>
 *    ) => ReturnType<S[key]>;
 *  },
 *  K extends string = Extract<keyof S, string>
 * >(strategies?: S, mixins?: [M1]): (...args: ConstructorParameters<M1>) => P;
 * <
 *   S extends StrategiesObject,
 *   M extends MixinClass,
 *   P extends {
 *     [key in K]: (
 *       ...args: Parameters<M['prototype'][key]>
 *     ) => ReturnType<S[key]>;
 *   },
 *   K extends Extract<keyof S, string>
 * >(
 *   strategies: S,
 *   mixins: M[]
 * ): (...args: ConstructorParameters<M>) => P;
 * }} DefineFunction
 */

// main export

/**
 * @template {StrategiesObject} S
 * @template {MixinClass} M
 * @template {{ [key in K]: (...args: Parameters<M['prototype'][key]>) => ReturnType<S[key]> }} P
 * @template {Extract<keyof S, string>} K
 * @param {S} strategies
 * @param {M[]} mixins
 * @returns {(...args: ConstructorParameters<M>) => P}
 */
function define(strategies = /** @type {S} */ ({}), mixins = []) {
  class Mixinable {
    /**
     * @constructor
     * @param {ConstructorParameters<M>} args
     */
    constructor(...args) {
      /**
       * @type {InstanceType<M>[]}
       */
      const mixinstances = mixins.map((Mixin) => {
        // @ts-ignore
        return new Mixin(...args);
      });
      Object.keys(strategies).forEach((method) => {
        /**
         *
         * @param {Array<(...args: any[]) => any>} functions
         * @param {InstanceType<M>} mixinstance
         */
        const reducer = (functions, mixinstance) => {
          if (isFunction(mixinstance[method])) {
            functions.push(mixinstance[method].bind(mixinstance));
          }
          return functions;
        };
        /** @type {InstanceType<M>} */ (this)[method] = strategies[method].bind(
          this,
          mixinstances.reduce(reducer, [])
        );
        mixinstances.forEach((mixinstance) => {
          mixinstance[method] = /** @type {InstanceType<M>} */ (this)[method];
        });
      });
    }
  }

  return function createMixinable(...args) {
    // @ts-ignore
    return /** @type {P} */ (new Mixinable(...args));
  };
}

/**
 * @type {DefineFunction}
 */
exports.define = define;

// strategy exports

/**
 * @template {Function} T
 * @template U
 * @param {Array<T>} functions
 * @param {Array<U>} args
 * @returns {ReturnType<T> | void}
 */
function override(functions, ...args) {
  const fn = functions.slice().pop();
  if (isFunction(fn)) {
    return fn(...args);
  }
}

exports.override = override;
exports.callable = override;

/**
 * @typedef {<T extends unknown[], U extends (...args: T) => Promise<any>>(functions: Array<U>, ...args: T) => Promise<Array<Unboxed<ReturnType<U>>>>} ParallelPromised
 * @typedef {<T extends unknown[], U extends (...args: T) => any>(functions: Array<U>, ...args: T) => Array<ReturnType<U>>} ParallelScalar
 * @type {ParallelPromised & ParallelScalar}
 */
const parallel = function parallel(
  /** @type {Array<(...args: any[]) => Promise<any>> | Array<(...args: any[]) => any>} */ functions,
  /** @type {unknown[]} */ ...args
) {
  // @ts-ignore
  const results = functions.map((fn) => {
    return fn(...args);
  });
  return results.find(isPromise) ? Promise.all(results) : results;
};

exports.parallel = parallel;

/**
 * @template {unknown[]} T
 * @template R
 * @param {Array<(a: R | Promise<R>, ...args: T) => R | Promise<R>>} functions
 * @param {R | Promise<R>} initial
 * @param {T} args
 * @returns {R | Promise<R>}
 */
function pipe(functions, initial, ...args) {
  return functions.reduce((result, fn) => {
    if (isPromise(result)) {
      return result.then((result) => {
        return fn(result, ...args);
      });
    }
    return fn(result, ...args);
  }, initial);
}

exports.pipe = pipe;

/**
 * @template {unknown[]} T
 * @template R
 * @param {Array<(a: R | Promise<R>, ...args: T) => R | Promise<R>>} functions
 * @param {R | Promise<R>} initial
 * @param {T} args
 * @returns {R | Promise<R>}
 */
function compose(functions, initial, ...args) {
  return pipe(
    functions.slice().reverse(),
    initial,
    ...args
  );
}

exports.compose = compose;

exports.async = {
  callable: asynchronize(override),
  override: asynchronize(override),
  parallel: asynchronize(parallel),
  pipe: asynchronize(pipe),
  compose: asynchronize(compose),
};

exports.sync = {
  callable: synchronize(override),
  override: synchronize(override),
  sequence: synchronize(parallel),
  parallel: synchronize(parallel),
  pipe: synchronize(pipe),
  compose: synchronize(compose),
};

// utilities

/**
 * @param {any} obj
 * @returns {obj is Function}
 */
function isFunction(obj) {
  return typeof obj === 'function';
}

/**
 * @param {any} obj
 * @returns {obj is Promise}
 */
function isPromise(obj) {
  return obj && isFunction(obj.then) && obj instanceof Promise;
}

/**
 * @template {Function} T
 * @param {T} fn
 * @returns {(...args: Parameters<T>) => Promise<ReturnType<T>>}
 */
function asynchronize(fn) {
  return function asyncFn(...args) {
    const obj = fn(...args);
    return isPromise(obj) ? obj : Promise.resolve(obj);
  };
}

/**
 * @template {Function} T
 * @param {T} fn
 * @returns {(...args: Parameters<T>) => ReturnType<T> | never}
 */
function synchronize(fn) {
  return function syncFn(...args) {
    const obj = fn(...args);
    if (isPromise(obj)) {
      throw new Error('got promise in sync mode');
    }
    return obj;
  };
}
