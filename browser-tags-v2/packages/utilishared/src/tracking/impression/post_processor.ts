import { watch_element } from "./intersection_observer";
import { send_impression_event } from ".";
import { get_tracking_event_context_data } from "../depict_tracking";
import { Node_Array } from "../../rendering/recommendation-renderer/types";
import { observer } from "../../element-observer";
import { dlog } from "../../logging/dlog";

/**
 * A Post processor for Recommendation renderer to add impression tracking to all displays
 */
export const impression_tracking_post_processor = (items, display, info) => {
  if (!items?.length) {
    return items;
  }
  const node_array = (Array.isArray(items) ? items : [...items]) as Node_Array; // if it's a NodeList convert it to an array
  const first_watchable_el = node_array.find(el => el instanceof Element);
  if (!first_watchable_el) {
    dlog("Impression tracking: Can't observe", items, display);
    return items;
  }

  if (!info.t) {
    dlog("Impression tracking: No tenant instance, can't track", items, display);
    return items;
  }

  observer.onexists(first_watchable_el, ({ element }) => {
    watch_element(element, () => {
      const { recommendation_id, search_result_id, product_listing_result_id, suggestions_result_id } = display;
      send_impression_event({
        ...get_tracking_event_context_data(),
        recommendation_type: info.rendering_options.type,
        entity_price: display.sale_price,
        market: info.t!.market,
        tenant: info.t!.tenant,
        product_id: display.product_id,
        recommendation_id,
        search_result_id,
        product_listing_result_id,
        suggestions_result_id,
      });
    });
  });
  return items;
};
