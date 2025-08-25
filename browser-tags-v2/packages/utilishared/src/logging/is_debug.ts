export const is_debug = /*@__PURE__*/ (() =>
  process.env.STRIP_DEBUG === "true"
    ? false
    : process.env.DEBUG === "true" ||
      process.env.NODE_ENV === "development" ||
      (process.env.BUILD_TARGET !== "node" &&
        (globalThis?.document?.currentScript?.dataset?.debug === "true" ||
          globalThis?.localStorage?.getItem?.("debug") === "true")))();
