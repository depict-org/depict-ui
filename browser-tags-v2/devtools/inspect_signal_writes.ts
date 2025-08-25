import { Signal } from "solid-js";

/*
Dev function to debug where writes to a Signal come from
 */
export function inspect_signal_writes<T>(signal: Signal<T>) {
  return [
    signal[0],
    new Proxy(signal[1], {
      apply(target, this_arg, arg_list) {
        debugger;
        return Reflect.apply(target, this_arg, arg_list);
      },
    }),
  ] as Signal<T>;
}
