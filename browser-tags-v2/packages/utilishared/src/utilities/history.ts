import { async_iterable_ipns } from "./infinite_promise/async_iterable_ipns";
import { err } from "../deprecated/err";
import { catchify } from "../logging/error";

type after_navig_fn = (
  arg0: Parameters<typeof history.replaceState | typeof history.pushState>,
  what_happened: "replaceState" | "pushState"
) => any;

/**
 * AsyncIterable which resolves with the new href every time location.href changes
 */
export const stateless_href_change_ipns = /*@__PURE__*/ async_iterable_ipns<string>(false);
/**
 * AsyncIterable which resolves when you await it with the current href and then once every time it changes
 */
export const href_change_ipns = /*@__PURE__*/ async_iterable_ipns<string>();
/**
 * Functions to instantly (synchronously) call when a "popstate" event occurs, before the href_change_ipns' resolve
 * This kind of bypasses the IPNS' point, and I'm sorry for that inconsistency, but I'm working on a feature that's not in the roadmap and am encountering issues due to the 1 tick delay of the IPNS. IPNS were a mistake, I'm sorry for them.
 */
export const instant_exec_on_suspect_history_change = /*@__PURE__*/ new Set<
  (
    what_happened?: "replaceState" | "pushState" | "popstate",
    args?: PopStateEvent | Parameters<typeof history.replaceState> | Parameters<typeof history.pushState>
  ) => void
>();

let old_url: string;
const maybe_navigation = (
  what_happened?: "replaceState" | "pushState" | "popstate",
  args?: PopStateEvent | Parameters<typeof history.replaceState> | Parameters<typeof history.pushState>
) => {
  if (typeof location === "undefined") return;
  const new_url = location.href;
  if (old_url !== new_url) {
    href_change_ipns(new_url);
    if (old_url !== undefined) {
      // don't resolve stateless href change ipns with the initial value - it's not a navigation
      stateless_href_change_ipns(new_url);
    }
    old_url = new_url;
  }
  for (const fn of instant_exec_on_suspect_history_change) {
    fn(what_happened, args);
  }
};
history_replacer((args, what_happened) => maybe_navigation(what_happened, args));
maybe_navigation();
globalThis?.window?.addEventListener(
  "popstate",
  catchify(e => maybe_navigation("popstate", e))
);

export async function on_next_navigation(callback: (new_href: string) => void) {
  const catchified_callback = catchify(callback);
  for await (const href of stateless_href_change_ipns) {
    catchified_callback(href);
    break;
  }
}

/**
 * Proxies history.pushState, and, if the second argument is true, history.replaceState so that it executes the provided `after_navigation` function after the navigation (calling the original function) but before returning to what called it.
 * Please also consider adding a listener to the `popstate` event (`window.addEventListener("popstate", handler)`) to cover ALL navigation possibilities.
 * @param  after_navigation                        Function to call after history.replaceState and history.pushState
 * @param  replace_replaceState=true               Whether to call the function also on history.replaceState.
 * @return                           Void
 */
export async function history_replacer(after_navigation: after_navig_fn, replace_replaceState = true) {
  if (typeof History === "undefined") return;
  const { prototype } = History;
  const instance = history;

  const polyfill_dance = (the_thing: "pushState" | "replaceState") => {
    const proxy_the_thing = (obj: History | typeof window.history) => {
      const orig_pushState = obj[the_thing];
      obj[the_thing] = new Proxy(orig_pushState, {
        apply: (target, this_arg, arguments_list) => {
          const nav_result = Reflect.apply(target, this_arg, arguments_list);
          try {
            after_navigation(arguments_list as Parameters<typeof after_navigation>[0], the_thing);
          } catch (e) {
            err(e);
          }
          return nav_result;
        },
      });
    };

    proxy_the_thing(prototype);
    if (Object.getOwnPropertyNames(instance).includes(the_thing)) {
      // we don't want to just change the instance because that's not the way to do it, but we don't want to not work because someone else did it wrong
      proxy_the_thing(instance);
    }
  };
  polyfill_dance("pushState");

  if (replace_replaceState) {
    polyfill_dance("replaceState");
  }
}
