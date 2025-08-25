import { is_debug } from "./is_debug";
import setup_sentry from "./sentry";
import { dlog } from "./dlog";

// Next requires environment variables to be prefixed by NEXT_PUBLIC
export const Sentry =
  !(
    process.env.SENTRY === "true" ||
    process.env.DEPICT_ERROR_REPORTING === "true" ||
    process.env.NEXT_PUBLIC_DEPICT_ERROR_REPORTING === "true"
  ) &&
  (process.env.SENTRY === "false" ||
    process.env.DEPICT_ERROR_REPORTING === "false" ||
    process.env.NEXT_PUBLIC_DEPICT_ERROR_REPORTING === "false" ||
    is_debug)
    ? /*@__PURE__*/ fakesentry()
    : /*@__PURE__*/ setup_sentry(process.env.TENANT || "unknown", undefined, dlog);

function fakesentry() {
  // // source: https://docs.sentry.io/platforms/javascript/troubleshooting/#dealing-with-ad-blockers
  // const handler = {
  //   get: function (_, key) {
  //     return new Proxy(function (cb) {
  //       if (key === "flush" || key === "close") return Promise.resolve();
  //       if (typeof cb === "function") return cb(fake_sentry);
  //       return fake_sentry;
  //     }, handler);
  //   },
  // };
  // var fake_sentry = new Proxy({ captureException: () => {}, captureMessage: () => {}, withScope: () => {} }, handler);

  // the magical proxy stuff has infinite looped for me on rp, old fashioned NOOP functions will have to make do
  type FunctionWithAnyParams = (...args: any[]) => void;
  const fake_sentry: {
    captureException: FunctionWithAnyParams;
    captureMessage: FunctionWithAnyParams;
    withScope: FunctionWithAnyParams;
  } = { captureException: () => {}, captureMessage: () => {}, withScope: () => {} };

  return fake_sentry;
}
