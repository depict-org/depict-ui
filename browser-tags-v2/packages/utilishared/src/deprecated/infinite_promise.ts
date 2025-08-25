/**
 * @deprecated use async_iterable_ipns instead. This can skip values which yields unexpected results.
 */

export function infinite_promise_creator() {
  // the idea is to have a new promise available immediately before one resolves, so to say an infinite promise
  let internal_resolve: ((value: any) => void) | undefined; // copy and pasted from iconbeauty
  const cart_promise_object = {
    // I feel like Anton is not going to like this extremely awesome approach
    promise: new Promise(r => (internal_resolve = r)), // which is why I'm reluctant with making it a library
    internal_resolve: internal_resolve, // Edit from later on: I have realised that this is actually very useful, it just has a steep learning curve.
    resolve: (argument?: any) => {
      // it allows both not having to call functions in a loop and instead just awaiting the promise from multiple places
      const oldresolve = cart_promise_object.internal_resolve; // and to effortlessly ensure a process is never running twice with 100% reliability
      cart_promise_object.promise = new Promise(r => (cart_promise_object.internal_resolve = r)); // it could be made a class, but I already know this works, so I'll leave it as is
      oldresolve!(argument);
    },
  };
  return cart_promise_object;
}
