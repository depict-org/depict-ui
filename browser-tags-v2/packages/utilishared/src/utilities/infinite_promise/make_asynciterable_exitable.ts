/**
 * You know how you can write `break` inside of a `for await` loop to exit it? Well, this lets you break the loop from outside. Pass any async iterable that never throws and you will get back a function and a specially proxied async iterable. Whenever you call the function all for await loops iterating the returned iterable will break. Note: This will add some extra ticks because awaiting thenable objects takes more ticks than awaiting promises.
 * @param  async_iterable               The async iterable you want to make exitable
 * @return                                                                 An array containing a function, the exit function, and a wrapped async iterable
 */

export function make_asyncIterable_exiter<T>(async_iterable: AsyncIterable<T>): [() => void, AsyncIterable<T>] {
  const promise_result_setting_functions = new Map<
    AsyncIterator<T, any, undefined>,
    Parameters<typeof Promise.prototype.then>[0]
  >();
  const exit_function = () => {
    const exit_iterator_object = {
      done: true,
      value: undefined,
    };
    for (const [iterator, on_resolve_or_on_finally] of promise_result_setting_functions) {
      if (!on_resolve_or_on_finally) {
        throw new Error("Got no resolve fn");
      }
      on_resolve_or_on_finally(iterator?.["return"]?.() || exit_iterator_object);
    }
    promise_result_setting_functions.clear();
  };
  const modified_async_iterable = {
    [Symbol.asyncIterator]: () => {
      const orig_iterator = async_iterable[Symbol.asyncIterator]();

      return new Proxy(orig_iterator, {
        get(target, property) {
          if (property === "next") {
            return () => {
              const orig_next_result = orig_iterator.next();
              return {
                then: (
                  fulfill: Parameters<typeof Promise.prototype.then>[0],
                  reject: Parameters<typeof Promise.prototype.then>[0]
                ) => {
                  promise_result_setting_functions.set(orig_iterator, fulfill);

                  return orig_next_result.then(value => {
                    promise_result_setting_functions.delete(orig_iterator);
                    return fulfill!(value);
                  }, reject);
                },
              };
            };
          }
          return target[property];
        },
      });
    },
  };
  return [exit_function, modified_async_iterable];
}
