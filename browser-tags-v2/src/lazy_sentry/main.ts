// polyill blocker dont change this line // import '../../lib/depict_polyfills/the_polyfills';

import {
  BrowserClient,
  Dedupe,
  defaultStackParser,
  HttpContext,
  Hub as OrigHub,
  Integrations,
  LinkedErrors,
  makeXHRTransport,
} from "@sentry/browser";

declare global {
  interface Window {
    _depict_ai_sentry: any;
  }
}

const Hub = new Proxy(OrigHub, {
  construct(target, arg_array, new_target) {
    const hub = Reflect.construct(target, arg_array, new_target) as OrigHub;
    hub.captureException = new Proxy(hub.captureException, {
      apply(target, this_arg, arg_list) {
        const extra = this_arg?.getScope?.()?._extra;
        const message = extra?.exception_message;
        const potentialErrorMessage = arg_list?.[0]?.message;
        const infiniteError =
          potentialErrorMessage?.includes?.("Infinite loop detected in create_modified_filters") &&
          Math.random() > 0.01;
        if (potentialErrorMessage === "Unrecognised category_title_type, UI will look messed up" || infiniteError) {
          console.log("[Depict] ignored error", arg_list, extra);
          return;
        }
        if (
          (message?.indexOf(".at' is undefined") > -1 || message?.indexOf(".at is not a function") > -1) &&
          typeof String.prototype.at !== "function"
        ) {
          console.log(
            "[Depict] Suppressing captureException call because String.at polyfill missing is not an error with the Depict SDK",
            extra?.stack
          );
          return;
        }
        return Reflect.apply(target, this_arg, arg_list);
      },
    });
    return hub;
  },
});

window._depict_ai_sentry = {
  BrowserClient: new Proxy(BrowserClient, {
    construct(target, arg_array, new_target) {
      if (typeof arg_array[0] == "object") {
        arg_array[0].stackParser = defaultStackParser;
        arg_array[0].transport = makeXHRTransport;
      }
      return Reflect.construct(target, arg_array, new_target);
    },
  }),
  Hub,
  defaultIntegrations: [
    new Integrations.InboundFilters(),
    new Integrations.FunctionToString(),
    new LinkedErrors(),
    new Dedupe(),
    new HttpContext(),
  ],
};
