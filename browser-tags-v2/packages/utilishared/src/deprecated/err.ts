import { is_debug } from "../logging/is_debug";
import { dlog } from "../logging/dlog";
import { Sentry } from "../logging/sentry_instance";

/**
 * @deprecated please use report instead and provide a severity
 */
export function err(exception: Error | any, error_for_stack?: Error): undefined {
  dlog(exception);
  if (is_debug) {
    /* eslint-disable no-console */
    console.trace();
  }
  if (process.env.BUILD_TARGET !== "node") {
    const { stack } = error_for_stack instanceof Error ? error_for_stack : new Error();
    const msg_is_error = exception instanceof Error;
    Sentry.withScope(function (scope) {
      if (msg_is_error) {
        scope.setExtra("primary_stack", exception.stack);
      }
      scope.setExtra(msg_is_error ? "secondary_stack" : "stack", stack);
      scope.setLevel("error");
      this.captureMessage(exception);
    });
  }
  return undefined;
}
