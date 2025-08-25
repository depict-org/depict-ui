import { TrackingEventContextData } from "../depict_tracking";
import { send_depict } from "../depict_transmission";
import { Optional } from "../../utilities/optional_type";

/** The start and end visibility threshold for an intersection to count as an impression */
export let impression_threshold = [0.6, 0.5];
export const set_impression_threshold = (start: number, end: number) => (impression_threshold = [start, end]);

/** The minimum duration the element has to be visible above the thresholds before it counts as an impression */
export const has_to_be_intersecting_for = 500;

/** What explicit information is needed to form an ImpressionEvent */
export type ExplicitImpressionEventData = {
  recommendation_type?: string;
  entity_price?: number;
  market?: string;
  tenant?: string;
  product_id?: string;
} & (
  | { recommendation_id: string }
  | { search_result_id: string }
  | { product_listing_result_id: string }
  | { suggestions_result_id: string }
);

/** What an impression event looks like when sent to the api */
export type ImpressionEvent = {
  /** The type for impression events should be element_visible */
  type: "element_visible";
} & (ExplicitImpressionEventData | TrackingEventContextData);

/**
 * Sends an impression event to the api.
 *
 * Impression events always use websockets.
 */
export const send_impression_event = (data: Optional<ImpressionEvent, "type">) => {
  data.type = "element_visible"; // Set the type to element_visible as this is optional to pass here.
  send_depict([data], true);
};

export { impression_tracking_post_processor } from "./post_processor";
export { impression_track_element } from "./impression_track_element";
