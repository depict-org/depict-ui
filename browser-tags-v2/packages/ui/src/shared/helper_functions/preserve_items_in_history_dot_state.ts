import { report } from "@depict-ai/utilishared";

export const prefixes_to_preserve_in_history_dot_state = /*#__PURE__*/ new Set<string>();

let has_ran = false;

/**
 * Prevent, usually SPAs, from deleting our stuff from history.state when they call history.pushState with a new object they have constructed. This will only run once no matter how often it's called.
 */
export function preserve_items_in_history_dot_state() {
  if (has_ran || typeof history !== "object") {
    return;
  }
  has_ran = true;
  for (const function_name of ["replaceState", "pushState"] as const) {
    if (Object.getOwnPropertyNames(history).includes(function_name)) {
      proxy_push_state(function_name, history);
    }
    proxy_push_state(function_name, History.prototype);
  }
}
function proxy_push_state(function_name: "replaceState" | "pushState", thing: History | typeof window.history) {
  thing[function_name] = new Proxy(thing[function_name], {
    apply(target, this_arg, arg_list) {
      try {
        const old_state = history.state;
        if (typeof old_state == "object" && old_state !== null) {
          // This effectively disallows the user from passing in a string, number, null or undefined
          const intended_new_value_as_obj = typeof arg_list[0] === "object" ? arg_list[0] ?? {} : {};
          const cloned_object = { ...intended_new_value_as_obj };
          for (const key in old_state) {
            if (!starts_with_any_prefix(key)) {
              // Don't preserve unrelated keys
              continue;
            }
            if (!(key in cloned_object)) {
              cloned_object[key] = old_state[key];
            }
          }
          arg_list[0] = cloned_object;
        }
      } catch (e) {
        report([e as Error, "Failed to preserve items in history.state"], "error");
      }
      return Reflect.apply(target, this_arg, arg_list);
    },
  });
}

function starts_with_any_prefix(key: string) {
  for (const prefix of prefixes_to_preserve_in_history_dot_state) {
    if (key.startsWith(prefix)) {
      return true;
    }
  }
}
