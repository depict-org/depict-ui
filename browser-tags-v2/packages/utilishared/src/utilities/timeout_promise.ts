/**
 * Timeout a promise after `ms` milliseconds.
 * If the promise is timed out this function will return `undefined` and not throw.
 */
export function timeout_promise<T>(promise: Promise<T>, ms: number) {
  const timeout: Promise<undefined> = new Promise(res => setTimeout(res, ms));
  return Promise.race([promise, timeout]);
}
