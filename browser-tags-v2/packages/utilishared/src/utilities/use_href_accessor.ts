import { createSignal, onCleanup } from "solid-js";
import { instant_exec_on_suspect_history_change } from "./history";

/**
 * Returns an accessor that reactively returns the current href of the page
 */
export function use_href_accessor() {
  const [href, set_href] = createSignal(location.href);
  const handler = () => set_href(location.href);

  instant_exec_on_suspect_history_change.add(handler);
  onCleanup(() => instant_exec_on_suspect_history_change.delete(handler));

  return href;
}
