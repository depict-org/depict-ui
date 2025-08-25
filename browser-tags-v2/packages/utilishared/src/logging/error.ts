import { is_debug } from "./is_debug";
import { Sentry } from "./sentry_instance";

/**
 * Severity level to send to sentry.
 * We can also send `log`, `info`, `debug`, `critical` and `fatal` but we haven't had a need for it yet.
 */
export type Severity = "error" | "warning"; // | "log" | "info" | "debug" | "critical" | "fatal",

/**
 * Wraps a function in a try/catch that sends the error to sentry.
 * Also works for functions returning a promise/async functions.
 * If the function threw the wrapped function will return `undefined`
 * @param fn The function to wrap
 * @param message The message of the sentry error
 * @param severity The severity level to send to sentry
 */
export function catchify<T extends any[], X>(fn: (...args: T) => X, message?: string, severity: Severity = "error") {
  return function () {
    const report_w_severity = (e: Error) => report(message ? [e, message] : e, severity);
    try {
      const return_value = Reflect.apply(fn, this, arguments);
      if (fn?.constructor?.name === "AsyncFunction" || typeof return_value?.then === "function") {
        return return_value.catch(report_w_severity);
      }
      return return_value;
    } catch (e) {
      report_w_severity(e);
    }
  } as (...args: T) => X extends Promise<any> ? Promise<undefined | Awaited<X>> : X | undefined;
}

/**
 * Send error message with given severity and extra info to sentry
 * @param msg         Error object to send to sentry or an array containing an error and a human-readable description for said error
 * @param severity    How severe the error is.
 *  - `"error"` - Things like not finding the market, unexpected product-id format. Even one of these errors is cause for concern.
 *  - `"warning"` - Things that we expect to happen _sometimes_, like network errors. A couple of them is normal,
 *                but if we suddenly get 1000s then that's an issue
 * @param input_data  An object with extra information to sent to sentry.
 *
 * @example
 * report([err, "Got to few recs"], "warning", {
 *   product_id,
 * })
 */
export function report(
  msg: Error | [Error, string],
  severity: Severity,
  input_data: { [key: string]: any; stack?: never } = {}
): void {
  const has_human_readable_name = Array.isArray(msg);

  if (is_debug) {
    /* eslint-disable no-console */
    console.info(`[sentry-${severity}]:`, ...(has_human_readable_name ? msg.reverse() : [msg]), "\n", input_data);
  }

  Sentry.withScope(function (scope: any) {
    const data_for_sending = {
      stack: has_human_readable_name ? msg[0] : msg,
      ...input_data,
      ...(has_human_readable_name ? { exception_message: msg[0].message } : {}),
    };
    for (const key in data_for_sending) {
      scope.setExtra(key, data_for_sending[key]);
    }
    scope.setLevel(severity);
    this.captureException(
      has_human_readable_name
        ? new Proxy(msg[0], {
            get(target, property) {
              if (property === "message") {
                return msg[1];
              }
              return target[property];
            },
          })
        : msg
    );
  });
}
