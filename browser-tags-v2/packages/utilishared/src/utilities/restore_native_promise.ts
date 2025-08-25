import { err } from "../deprecated/err";
import { is_native } from "../../../../lib/depict_polyfills/is_native";
import { dlog } from "../logging/dlog";

const promise_as_string = "Promise";
/**
 * restore (if no allSettled and prototype.finally) native Promise and cement Promise - some customers force polyfill promise with flawed implementations of .all and .allSettled that randomly throw (see usage examples)
 * @return void
 */
export function replace_promise_with_native_if_exists_and_enforce() {
  try {
    const w = window;
    let da_promise = w[promise_as_string];
    let iframe_promise: ReturnType<typeof get_iframe_promise>;
    if (
      (typeof da_promise.allSettled !== "function" || typeof da_promise?.prototype?.finally !== "function") &&
      !is_native(da_promise) &&
      (iframe_promise = get_iframe_promise())
    ) {
      da_promise = iframe_promise;
    }
    if (da_promise) {
      if (Object.getOwnPropertyDescriptor(w, promise_as_string)?.configurable !== false) {
        Object.defineProperty(w, promise_as_string, {
          configurable: false,
          enumerable: true,
          get() {
            return da_promise;
          },
          set(value) {
            return value;
          },
        });
      } else {
        dlog("Unable to redefine " + promise_as_string + ", it's already nonconfigurable");
      }
    }
  } catch (e) {
    err(e);
  }
}

/**
 * Creates a blank iframe inside <head> and returns window.Promise out of it
 * @return a pristine, unpolyfilled window.Promise
 */
export function get_iframe_promise() {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.head.appendChild(iframe);
  return iframe?.contentWindow?.[promise_as_string] as typeof window.Promise;
}
