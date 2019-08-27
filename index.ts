interface StrategiesObject {
  [key: string]: (...args: any[]) => any;
}

interface MixinClass {
  new (...args: any[]): any;
  [name: string]: any;
}

export default function define<
  S extends StrategiesObject,
  M1 extends MixinClass,
  M2 extends MixinClass,
  M3 extends MixinClass,
  P extends {
    [key in K]: (
      ...args: ArgumentsType<(M1 & M2 & M3)['prototype'][key]>
    ) => ReturnType<S[key]>;
  },
  K extends string = Extract<keyof S, string>
>(
  strategies?: S,
  mixins?: [M1, M2, M3]
): (...args: ConstructorArgumentsType<M1 & M2 & M3>) => P;

export default function define<
  S extends StrategiesObject,
  M1 extends MixinClass,
  M2 extends MixinClass,
  P extends {
    [key in K]: (
      ...args: ArgumentsType<(M1 & M2)['prototype'][key]>
    ) => ReturnType<S[key]>;
  },
  K extends string = Extract<keyof S, string>
>(
  strategies?: S,
  mixins?: [M1, M2]
): (...args: ConstructorArgumentsType<M1 & M2>) => P;

export default function define<
  S extends StrategiesObject,
  M1 extends MixinClass,
  P extends {
    [key in K]: (
      ...args: ArgumentsType<M1['prototype'][key]>
    ) => ReturnType<S[key]>;
  },
  K extends string = Extract<keyof S, string>
>(strategies?: S, mixins?: [M1]): (...args: ConstructorArgumentsType<M1>) => P;

export default function define<
  S extends StrategiesObject,
  M extends MixinClass,
  P extends {
    [key in K]: (
      ...args: ArgumentsType<M['prototype'][key]>
    ) => ReturnType<S[key]>;
  },
  K extends string = Extract<keyof S, string>
>(
  strategies: S = {} as S,
  mixins: M[] = []
): (...args: ConstructorArgumentsType<M>) => P {
  class Mixinable {
    constructor(...args: ConstructorArgumentsType<M>) {
      const mixinstances: InstanceType<M>[] = mixins.map(
        (Mixin) => new Mixin(...args)
      );

      Object.keys(strategies).forEach((method) => {
        (this as InstanceType<M>)[method] = strategies[method].bind(
          this,
          mixinstances.reduce(
            (functions: Array<(...args: any[]) => any>, mixinstance) => {
              if (isFunction(mixinstance[method])) {
                functions.push(mixinstance[method].bind(mixinstance));
              }
              return functions;
            },
            []
          )
        );
        mixinstances.forEach((mixinstance) => {
          mixinstance[method] = (this as InstanceType<M>)[method];
        });
      });
    }
  }

  return function createMixinable(...args) {
    return new Mixinable(...args) as P;
  };
}

export function override<T extends unknown[], U>(
  functions: Array<(...args: T) => U>,
  ...args: T
): U | void {
  const fn = functions.slice().pop();
  if (isFunction(fn)) {
    return fn(...args);
  }
}
export const callable = override;

export function parallel<T extends unknown[]>(
  functions: Array<(...args: T) => unknown>,
  ...args: T
): unknown[] | Promise<unknown[]> {
  const results = functions.map((fn) => {
    return fn(...args);
  });
  return results.find(isPromise) ? Promise.all(results) : results;
}

export function pipe<T extends unknown[], R>(
  functions: Array<(a: R | Promise<R>, ...args: T) => R | Promise<R>>,
  initial: R | Promise<R>,
  ...args: T
): R | Promise<R> {
  return functions.reduce((result, fn) => {
    if (isPromise(result)) {
      return result.then((result) => {
        return fn(result, ...args);
      });
    }
    return fn(result, ...args);
  }, initial);
}

export function compose<T extends unknown[], R>(
  functions: Array<(a: R | Promise<R>, ...args: T) => R | Promise<R>>,
  ...args: T
): R | Promise<R> {
  return exports.pipe(
    functions.slice().reverse(),
    ...args
  );
}

export const async = {
  callable: asynchronize(override),
  override: asynchronize(override),
  parallel: asynchronize(parallel),
  pipe: asynchronize(pipe),
  compose: asynchronize(compose),
};

export const sync = {
  callable: synchronize(override),
  override: synchronize(override),
  sequence: synchronize(parallel),
  parallel: synchronize(parallel),
  pipe: synchronize(pipe),
  compose: synchronize(compose),
};

// tslint:disable-next-line ban-types
function isFunction(obj: any): obj is Function {
  return typeof obj === 'function';
}

function isPromise(obj: any): obj is Promise<any> {
  return obj && isFunction(obj.then) && obj instanceof Promise;
}

function asynchronize<T extends (...args: any[]) => any>(
  fn: T
): (...args: ArgumentsType<T>) => Promise<ReturnType<T>> {
  return function asyncFn(...args) {
    const obj = fn(...args);
    return isPromise(obj) ? obj : Promise.resolve(obj);
  };
}

function synchronize<T extends (...args: any[]) => any>(
  fn: T
): (...args: ArgumentsType<T>) => ReturnType<T> | never {
  return function syncFn(...args) {
    const obj = fn(...args);
    if (isPromise(obj)) {
      throw new Error('got promise in sync mode');
    }
    return obj;
  };
}

// tslint:disable-next-line ban-types
type ArgumentsType<F extends Function> = F extends (...args: infer A) => any
  ? A
  : never;

type ConstructorArgumentsType<T> = T extends new (...args: infer U) => any
  ? U
  : never;
