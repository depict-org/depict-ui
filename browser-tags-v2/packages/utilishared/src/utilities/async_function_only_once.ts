import { catchify } from "../logging/error";

export type AsyncFunction<A extends any[], O> = (...args: A) => Promise<O>; // source: https://stackoverflow.com/a/53901625

/**
 * Wraps an async function and makes sure the returned wrapped function can only be "executing" once at the same time.
 * @param  the_function an async function to wrap
 * @return         The same function but wrapped so that it can only run once at once, no matter how often you call it
 */

export function deparallelize<A extends any[], O>(the_function: AsyncFunction<A, O>) {
  let busy = false;
  let current_promise: Promise<O | undefined>;
  return catchify(async (...args: A) => {
    // Double awaits to make sure that if busy is true, it must also be true two ticks later.
    // This is a fix for when a promise that finalizes immediately is passed.
    // For context: https://javascript.info/microtask-queue
    if (!busy || !(await await busy, busy)) {
      busy = true;
      const to_finally = catchify(the_function)(...args);
      current_promise = to_finally.finally(() => (busy = false));
    }
    return current_promise;
  });
}

/**
 * Like deparallelize but it makes sure that the last call of the function, while it's busy, will be executed after it's no longer busy.
 */
export function deparallelize_no_drop<A extends any[], O>(the_function: AsyncFunction<A, O>) {
  let busy = false;
  let queued: undefined | A;
  let current_promise: Promise<O | undefined>;
  const wrapped_fn = catchify(async (...args: A) => {
    // Double awaits to make sure that if busy is true, it must also be true two ticks later.
    // This is a fix for when a promise that finalizes immediately is passed.
    // For context: https://javascript.info/microtask-queue
    if (!busy || !(await await busy, busy)) {
      busy = true;
      const to_finally = catchify(the_function)(...args);
      current_promise = to_finally.finally(() => {
        busy = false;
        if (queued) {
          const q_val = queued;
          queued = undefined;
          wrapped_fn(...q_val);
        }
      });
    } else {
      queued = args;
    }
    return current_promise;
  });
  return wrapped_fn;
}
