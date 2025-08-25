import { depict_prefilled } from "./depict_tracking";
import { Display } from "../rendering/recommendation-renderer/types";
import { queueMacroTask } from "../utilities/queueMacroTask";
import { onCleanup } from "solid-js";

interface SDKRenderingInfo {
  set_on_index_change: (fn: (index: number) => void) => void;
}

/**
 * Creates a handler for sending the "recommendations_inserted" event on new results.
 * Usage: call make_plp_recommendations_inserted_handler with options and then call the returned functions in your productCardTemplate
 */
export function make_plp_recommendations_inserted_handler(tenant: string, market: string, type: "search" | "category") {
  let queued_sending = false;
  const current_displays = new Set<Display>();
  return function <T extends Display>(display: T | null, info?: SDKRenderingInfo) {
    if (!display) return;

    info!.set_on_index_change(() => {
      current_displays.add(display);
      onCleanup(() => current_displays.delete(display));
      if (!queued_sending) {
        queued_sending = true;
        queueMacroTask(() => {
          depict_prefilled({
            tenant,
            market,
            recommendation_type: type,
            type: "recommendations_inserted",
          });
          queued_sending = false;
        });
      }
    });
  };
}
