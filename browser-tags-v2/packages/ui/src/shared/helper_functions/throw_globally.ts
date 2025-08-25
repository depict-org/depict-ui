/**
 * Wraps a function in a try/catch block and throws the error globally. If undefined is provided as fn, a no-op is returned.
 * @param fn the function to wrap
 */
export function throw_globally<T extends (...args: any) => any>(fn?: T) {
  return function (...args: Parameters<T>): ReturnType<T> | undefined {
    if (!fn) return;
    try {
      return Reflect.apply(fn, this, args);
    } catch (e) {
      queueMicrotask(() => {
        throw e;
      });
    }
  };
}
