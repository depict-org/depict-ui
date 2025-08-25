import { untrack } from "solid-js";

type Writeable<T> = { -readonly [P in keyof T]: T[P] }; // https://stackoverflow.com/a/43001581

/**
 * Makes an accessor (wrapped around the props store of wrap_solid_in_react) and a rudimentary set function which React's useState returns into a signal
 */
export function get_set_function_to_signal<T>(get_value: () => T, get_set_function: () => (new_value: T) => void) {
  const return_value = [
    get_value,
    (newValueOrFunction: T | ((new_value: T) => T)) => {
      if (typeof newValueOrFunction == "function") {
        const old_value = untrack(get_value);
        const new_value = (newValueOrFunction as (new_value: T) => T)(old_value);
        untrack(get_set_function)(new_value);
      } else {
        untrack(get_set_function)(newValueOrFunction);
      }
      return undefined as any;
    },
  ] as const;
  return return_value as Writeable<typeof return_value>;
}
