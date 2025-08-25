import { make_simple_async_iterable, RawObservableInformation } from "./infinite_promise_v3";
import { make_asyncIterable_exiter } from "./make_asynciterable_exitable";
import { defining_defineProperty } from "../defining_define_property";

export type IPNS<T> = ((...values: T[]) => void) &
  AsyncIterable<T> & {
    exit: () => void;
    state: T | undefined;
    latest_call_value: T | undefined;
  };

const compat_layer_to_info = /*@__PURE__*/ new WeakMap<IPNS<any>, WeakRef<RawObservableInformation<any>>>();

/**
 * Creates an async iterable IPNS with "the old" API (we should maybe create a new one? idk). BUT which is resistant against things taking more than one tick. Meaning you can use `await` in the `for await` body without missing values
 * # More about IPNS
 * It's a form of observable. Basically an infinite promise.
 * You await it by using for-await and you resolve it (as often as you like) by calling it.
 * List of random details:
 * 1. You can call it as fast as you like, the values will propagate into the for-awaits once all for-awaits have finished processing the value
 * 2. Giving it multiple arguments and calling it multiple times is the same thing
 * 3. IPNS.exit(); is going to make all for-await loops currently awaiting it exit EXCEPT for ones with currently executing loop bodies. Means if you do `IPNS.exit()` it won't exit the current loop - for that you need to use `break`. It does not change the IPNS in any other way so you can continue using it afterwards.
 * 4. You can use make_asyncIterable_exiter() to make individual for-await loop exit (stop awaiting the infinite promise) from the outside
 * 5. You can of course break and return any time from the for-await to stop awaiting
 * 6. IPNS.state gives you the value that's currently processed inside of the for-awaits from the outside
 * 7. IPNS.latest_call_value is the value that the IPNS was last called with (it doesn't have to have propagated everywhere yet)
 * @param  exitable               Whether the async iterator should return the currently resolving value on the first call or not
 * @param  {state_obj}                 RawObservableInformation instance that contains the actual inner values of the IPNS
 * @return          An IPNS.
 */
export function async_iterable_ipns<T>(
  async_iterator_should_return_state_on_first_call: boolean = true,
  state_obj = new RawObservableInformation<T>()
): IPNS<T> {
  // @ts-ignore
  on_async_iterator_next_called({}); // work around https://github.com/swc-project/swc/issues/5530
  const ai = make_simple_async_iterable<T>(state_obj);
  const [exit, exitable] = make_asyncIterable_exiter<T>({ ...ai });
  const obj = Object.assign(exitable, { exit });

  if (async_iterator_should_return_state_on_first_call) {
    const orig_iterator = {
      [Symbol.asyncIterator]: obj[Symbol.asyncIterator],
    };

    obj[Symbol.asyncIterator] = () => {
      let was_exited = false;
      let should_unblock_state_obj_after_next_called = false;
      let stock_return_function: VoidFunction;
      const unblock_state_obj = () => {
        if (should_unblock_state_obj_after_next_called) {
          should_unblock_state_obj_after_next_called = false;
          state_obj.waiting_for_update_--;
          state_obj.call_subscribers_();
        }
      };

      const async_generator = async function* () {
        if (was_exited) {
          return; // just in case
        }

        if (state_obj.has_had_value_) {
          state_obj.waiting_for_update_++; // block RawObservableInformation from changing a value while we feed this to our for-await loop, this makes so that values can't be missed if they are pushed as a result by below yield
          should_unblock_state_obj_after_next_called = true;
          yield state_obj.last_processed_value_!;
          // if we have resolved with a value before info.last_processed_valuestate should no longer be undefined (unless T is undefined) so we can assert this being non-null
          if (was_exited) {
            // only once we're at `yield* exitable_for_async_generator;` exit_async_generator will be able to make the async generator stop and return, we add this check so that it also works before
            unblock_state_obj();
            return;
          }
        }
        yield* on_async_iterator_next_called(
          exitable_for_async_generator,
          unblock_state_obj,
          fn => (stock_return_function = fn)
        );
      };
      const iterator = async_generator();
      const [exit_async_generator, exitable_for_async_generator] = make_asyncIterable_exiter(orig_iterator);
      // we can't use a normal async generator since it can't be "quit" from the outside (by calling .return on the AsyncIterator) while being awaited apparently
      // therefore we make the async iterable that it's (soon) passing control onto exitable by calling .return() (even if a .next() promise is being currently awaited)
      iterator.return = () => {
        stock_return_function?.();
        unblock_state_obj();
        exit_async_generator();
        was_exited = true;
        return Promise.resolve({ done: true, value: undefined });
      };
      return iterator;
    };
  }

  const callable_obj_with_everything = Object.assign(ai, obj);

  defining_defineProperty(callable_obj_with_everything, "state", {
    get: () => state_obj.last_processed_value_,
    enumerable: true,
  });

  defining_defineProperty(callable_obj_with_everything, "latest_call_value", {
    get: () => state_obj.queue_[state_obj.queue_.length - 1] ?? callable_obj_with_everything.state,
    enumerable: true,
  });
  compat_layer_to_info.set(callable_obj_with_everything, new WeakRef(state_obj));

  return callable_obj_with_everything;
}

function on_async_iterator_next_called<T>(
  async_iterable: AsyncIterable<T>,
  before_next_return: VoidFunction,
  set_stock_return_function?: (fn: VoidFunction) => void
) {
  return new Proxy(async_iterable, {
    get(target, property) {
      return new Proxy(target[property], {
        apply(target, this_arg, arg_list) {
          const iterator = target.apply(this_arg, arg_list);
          const { return: return_fn } = iterator;
          if (return_fn) {
            set_stock_return_function?.(return_fn);
          }

          return new Proxy(iterator, {
            get(inner_target, inner_property) {
              const value = inner_target[inner_property];
              if (inner_property === "next") {
                return new Proxy(value, {
                  apply(next_target, next_this_arg, next_arg_list) {
                    const retval = next_target.apply(next_this_arg, next_arg_list);

                    before_next_return();

                    return retval;
                  },
                });
              }
              return value;
            },
          });
        },
      });
    },
  });
}

/**
 * Takes an IPNS that always resolves with state on first await and returns one that's in sync with the first one and doesn't
 * @param  ipns               IPNS to create "clone" of
 * @return      A "cloned" ipns with the desired state-behavior. Keep in mind that exiting this one will not exit the one that was cloned.
 */
export function make_ipns_stateless<T>(ipns: IPNS<T>) {
  const internal_state_obj = compat_layer_to_info.get(ipns)?.deref?.();
  if (!internal_state_obj) {
    throw new Error("Couldn't get state obj");
  }
  return async_iterable_ipns(false, internal_state_obj);
}

/**
 * Takes an IPNS that doesn't resolve with state on first await and returns one that's in sync with the first one and does
 * @param  ipns               IPNS to create "clone" of
 * @return      A "cloned" ipns with the desired state-behavior. Keep in mind that exiting this one will not exit the one that was cloned.
 */
export function make_ipns_stateful<T>(ipns: IPNS<T>) {
  const internal_state_obj = compat_layer_to_info.get(ipns)?.deref?.();
  if (!internal_state_obj) {
    throw new Error("Couldn't get state obj");
  }
  return async_iterable_ipns(true, internal_state_obj);
}
