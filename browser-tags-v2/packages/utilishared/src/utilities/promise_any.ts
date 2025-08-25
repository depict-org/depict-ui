// https://stackoverflow.com/a/39941616
function invert_promise(promise) {
  return new Promise((res, rej) => promise.then(rej, res));
}
export function Promise_Any<T>(promises: (T | PromiseLike<T>)[] | Iterable<T | PromiseLike<T>>): Promise<T> {
  return Promise?.any?.(promises) ?? (invert_promise(Promise.all([...promises].map(invert_promise))) as Promise<T>);
}
