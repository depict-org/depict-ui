import { ExplicitImpressionEventData, send_impression_event } from ".";
import { get_tracking_event_context_data } from "../depict_tracking";
import { watch_element } from "./intersection_observer";
import { observer } from "../../element-observer";

interface ImpressionTrackingOptions {
  /** The element to observe for impressions. */
  element: HTMLElement;
  /** The impression data to send to the api (this is combined with context data) */
  data: ExplicitImpressionEventData;
  /** When true the element will be observed by the IntersectionObserver only after it's inserted into the DOM.
   * Sometimes with a pollyfilled IntersectionObserver it ignores elements that are not in the DOM yet.
   * Defaults to true.
   * */
  wait_for_dom_insertion?: boolean;
}

/**
 * Registers the passed element for impression tracking.
 * The element will be observed for intersection with the viewport.
 * Also handles sending the impression event.
 *
 * @return A function to stop observing the element for impressions
 */
export const impression_track_element = ({
  element,
  data,
  wait_for_dom_insertion = true,
}: ImpressionTrackingOptions) => {
  const disconnectors: VoidFunction[] = [];
  const impression_track = () => {
    const disconnector = watch_element(element, () => {
      send_impression_event({
        ...get_tracking_event_context_data(),
        ...data,
      });
    });
    disconnectors.push(disconnector);
  };
  if (wait_for_dom_insertion) {
    disconnectors.push(observer.onexists(element, impression_track));
  } else {
    impression_track();
  }
  return () => disconnectors.forEach(disconnector => disconnector());
};
