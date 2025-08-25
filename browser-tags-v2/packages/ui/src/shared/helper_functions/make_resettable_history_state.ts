import { history_dot_state_to_state } from "./history_dot_state_to_state";
import { PseudoRouter } from "./pseudo_router";
import { prefixes_to_preserve_in_history_dot_state } from "./preserve_items_in_history_dot_state";

/**
 * A wrapper around history_dot_state_to_state that adds a function to reset everything to default values. Can also prefix the keys to allow multiple instances of the same state.
 */
export function make_resettable_history_state<Param extends string, DefaultValue>({
  get_default_values_,
  router_,
  prefix_,
  preserveKeys_,
}: {
  get_default_values_: () => Record<Param, DefaultValue>;
  router_: PseudoRouter;
  prefix_: string;
  preserveKeys_?: string[];
}) {
  const get_prefixed_default_values_ = () => {
    const default_values = get_default_values_();
    return Object.fromEntries(Object.entries(default_values).map(([key, value]) => [prefix_ + key, value]));
  };
  const prefixed_state = history_dot_state_to_state(get_prefixed_default_values_(), router_);
  const prefixedPreserveKeys = preserveKeys_?.map(key => prefix_ + key);
  const reset_state = () => {
    const new_defaults = get_prefixed_default_values_();
    for (const key in prefixed_state) {
      if (prefixedPreserveKeys?.includes(key)) continue;
      const new_value = new_defaults[key];
      prefixed_state[key][1](new_value);
    }
  };
  let unprefixed_state: ReturnType<typeof history_dot_state_to_state<Param, DefaultValue>>;

  unprefixed_state = Object.fromEntries(
    Object.entries(prefixed_state).map(([key, value]) => [key.slice(prefix_.length), value])
  ) as any;

  prefixes_to_preserve_in_history_dot_state.add(prefix_);
  // There's intentionally no onCleanup here since we want to preserve the state even if all components (in i.e. react-ui) that use the provider running this are unmounted and the provider is destroyed, since it might be re-created and need the old state (for example for doing scroll restoration)

  return [reset_state, unprefixed_state] as const;
}
