/**
 * @deprecated this was a stupid idea, it's much easier to read if one just does a quick arrow function that provides the wanted arguments
 */

export function cache_args(fn, ...args) {
  return function (...unimportant_args) {
    return fn.apply(this, [...args, ...unimportant_args]);
  };
}
