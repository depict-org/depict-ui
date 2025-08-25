import { has_to_be_intersecting_for, impression_threshold } from "./index";
import { dlog } from "../../logging/dlog";
import { observer } from "../../element-observer";
import { catchify } from "../../logging/error";
import { buildThresholdList } from "../../utilities/build_threshold_list";

/**
 * Elements currently intersecting with the viewport.
 * If they are intersecting for the `has_to_be_intersecting_for` duration, we count it as an impression, and call the callback.
 */
const current_intersections = /*@__PURE__*/ new WeakMap<
  Element,
  { started_intersecting_at_: number; callback_timeout_?: ReturnType<typeof setTimeout> }
>();

type Callback = (target: Element) => void;
/**
 *  Currently watched elements by the intersection observer with their respective callback
 * */
const watched_elements = /*@__PURE__*/ new WeakMap<Element, Callback>();

const unwatch_element = (element: Element) => {
  intersection_observer?.unobserve(element);
  watched_elements.delete(element);
  current_intersections.delete(element);
};
/**
 * Start watching an element for impression tracking.
 */
export const watch_element = (element: Element, callback: Callback) => {
  if (watched_elements.has(element)) {
    dlog("Not watching", element, "as it's already being watched");
    return () => {};
  }

  intersection_observer?.observe(element);
  /** Calls the given callback and makes sure to stop watching the element  */
  const wrapped_callback: Callback = element => {
    callback(element);
    unwatch_element(element);
  };
  watched_elements.set(element, wrapped_callback);

  const disconnect_observer = observer.onremoved(element, () => {
    // Sometimes it has already rapidly been reinserted. The observer events lag by one tick.
    // For that case, make sure we're really out of the DOM
    if (document.documentElement.contains(element)) {
      return;
    }
    unwatch_element(element);
  });

  return () => {
    disconnect_observer();
    unwatch_element(element);
  };
};

const intersection_observer_callback = (entries: IntersectionObserverEntry[]) => {
  for (const record of entries) {
    const { target } = record;
    const callback = watched_elements.get(target);
    // Skip the element if it's no longer being watched.
    if (!callback) {
      intersection_observer?.unobserve(target);
      continue;
    }

    const currently_intersecting = current_intersections.has(target);
    if (!currently_intersecting && record.intersectionRatio >= impression_threshold[0]) {
      // we're intersecting enough and not already in the process of "measuring"
      const started_intersecting_at_ = +new Date(); // save start time

      // Schedule the callback function to be called after the element has been intersecting for the required duration
      const callback_timeout_ = setTimeout(callback, has_to_be_intersecting_for, target) as unknown as ReturnType<
        typeof setTimeout
      >;
      current_intersections.set(target, { started_intersecting_at_, callback_timeout_ });
    } else if (currently_intersecting && record.intersectionRatio < impression_threshold[1]) {
      // we are in the process of "measuring" and went below the threshold
      const { started_intersecting_at_, callback_timeout_ } = current_intersections.get(target)!;
      const time_elapsed = +new Date() - started_intersecting_at_;
      // If we stopped intersecting too early we want to abort our timeout.
      // if we did not we also want to abort the timeout since it's been lagging and just instantly send the event
      // (the browser can delay setTimeout timers)
      clearTimeout(callback_timeout_);
      if (time_elapsed <= has_to_be_intersecting_for) {
        current_intersections.delete(target);
      } else {
        // we intersected long enough
        dlog("intersection_observer: setTimeout lagged", time_elapsed, has_to_be_intersecting_for, "ms", target);
        callback(target);
      }
    }
  }
};

/**
 * Global IntersectionObserver used for all impression tracking.
 * It's faster to use one observer for all elements than to create a new one for each element.
 */

const intersection_observer =
  typeof window === "object"
    ? /*@__PURE__*/ new IntersectionObserver(/*@__PURE__*/ catchify(intersection_observer_callback), {
        threshold: /*@__PURE__*/ buildThresholdList(8),
      })
    : undefined;
