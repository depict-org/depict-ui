let promise: Promise<void>;

export function polyfill_queueMicrotask() {
  // inspired by https://github.com/feross/queue-microtask/blob/master/index.js
    // There's an infinite loop case where core-js thinks it can use this for its Promise polyfill.
    // We circumvent that by not defining a `value` in the property descriptor (see https://github.com/zloirock/core-js/blob/47bdf63d33fa17ef592c7d3fda582e3cf4581af1/packages/core-js/internals/microtask.js#L17).
  if(!globalThis.queueMicrotask){
      let actual_value = (cb: VoidFunction) => {
          (promise ||= Promise.resolve()).then(cb);
      };
      Object.defineProperty(globalThis, 'queueMicrotask', {
          get(){
              return actual_value;
          },
          set(value){
              actual_value = value;
          },
          configurable: true,
          enumerable: true
      });
  }

}
