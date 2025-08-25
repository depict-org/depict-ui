/**
 * Solid-start's useSearchParams has multiple issues, namely that it doesn't update instantly, so it's easy to get into a "bouncing" where the wrong state prevails, when syncing it with a store or signal value. Additionally, the setter is accidentally reactive it seems. We should maybe report that as bug.
 */
import { createMemo } from "solid-js";
import { use_href_accessor } from "@depict-ai/utilishared/latest";

export function get_instant_current_url_as_object() {
  const href = use_href_accessor();
  return createMemo(() => new URL(href()));
}
