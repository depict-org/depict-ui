import { Accessor, createMemo, JSX as solid_JSX, Show } from "solid-js";
import { globalState } from "../global_state";

export function SolidShowComponentAfterStateSet(props: { children: solid_JSX.Element; isSet?: Accessor<boolean> }) {
  const default_is_set = createMemo(
    () => !!(globalState.merchant[0]() && globalState.market[0]() && globalState.usedLocale[0]()?.backend_locale_)
  );
  const should_show = createMemo<boolean>(prev => {
    if (!prev && globalState.provider_is_updating[0]()) {
      // Why `!prev`? See https://gitlab.com/depict-ai/depict.ai/-/merge_requests/7854#note_1495776987
      // If we weren't showing the component and the DepictProvider is currently updating, wait for it to have finished updating before showing the component
      // Otherwise as soon as tenant and market is set we render the CategoryPage, but we might not have a DepictCategory yet, see https://depictaiworkspace.slack.com/archives/C04UZ2Z0RNE/p1690895918347289?thread_ts=1688391305.529449&cid=C04UZ2Z0RNE
      return false;
    }
    return (props.isSet || default_is_set)();
  });
  return <Show when={should_show()}>{props.children}</Show>;
}
