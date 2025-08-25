import { dlog } from "../logging/dlog";
import { catchify } from "../logging/error";

/**
 * Adds an event listener to a given element (example: recommendation link) which adds the provided product_id and recommendation_id to the 'depict' localStorage object
 * @param {HTMLElement} a_element - The element to listen on the "click event"
 * @param {string} product_id - A unique identifier for the product which can be used to rerecognize it on the product page
 * @param {string} recommendation_id - The recommendation ID of the recommendation
 * @param {Function} additional_listener - An additional function to execute onclick
 */
export function bind_tracking_to_link(
  a_element: Element,
  product_id: string,
  recommendation_id: string,
  additional_listener?: Function
) {
  if (
    !a_element ||
    // @ts-ignore
    !a_element.depict_tracked ||
    // @ts-ignore
    a_element?.depict_tracked?.recommendation_id != recommendation_id ||
    // @ts-ignore
    a_element?.depict_tracked?.product_id != product_id
  ) {
    const listener = (e: Event) => {
      localStorage.setItem(`depict_attribution_${product_id}`, recommendation_id);
      if (additional_listener) {
        additional_listener(e, product_id, recommendation_id);
      }
    };
    // @ts-ignore
    if (a_element.depict_tracked) {
      // @ts-ignore
      a_element.removeEventListener("click", a_element.depict_tracked?.listener);
    }
    // @ts-ignore
    a_element.depict_tracked = { product_id: product_id, recommendation_id: recommendation_id, listener: listener };
    a_element.addEventListener("click", listener);
    return listener;
  }
}

export type A2CTrackingFunction = (
  product_id: string,
  recommendation_id: string,
  was_unmatching: boolean,
  event: Event
) => any;

/**
 * Adds an event listener to a given element (example: the purchase button) which calls `tracking_fn(product_id,recommendation_id)` if the product_id exists in the 'depict' localStorage object
 * @param {HTMLElement} button - The element to listen on the "click event"
 * @param {Function} get_product_id - A function to get the product_id of the current page/the product associated with the add to cart button
 * @param {A2CTrackingFunction} tracking_fn - A function which gets executed on click of button
 * @param {Boolean} [unmatching_tracking] - also call tracking_fn on products not found in localStorage.
 */
/*
Arguments tracking_fn is called with:
product_id: the product id returned by get_product_id
recommendation_id: the recommendation id found in localStorage put there by bind_tracking_to_link
foreign_event: (only if unmatching_tracking is enabled) specifies whether the event could not be found in localstorage
click_event: the onclick event itself (useful i.e. for tracking functions reading product information out of the element triggering the event)
*/
export async function bind_to_a2c_button(
  button: Element,
  get_product_id: (url?: string, e?: Event) => string | Promise<string>,
  tracking_fn: A2CTrackingFunction,
  unmatching_tracking?: boolean,
  event?: string
) {
  // @ts-ignore
  if (!button || button.depict_tracked) {
    return;
  }
  button.addEventListener(
    event ? event : "click",
    catchify(async e => {
      if (!e.isTrusted) {
        dlog("ignoring event", e, "because it's not user generated");
        return;
      }
      const product_id = await get_product_id(undefined, e);
      if (product_id) {
        const item_name = `depict_attribution_${product_id}`;
        const recommendation_id = localStorage.getItem(item_name);
        if (recommendation_id) {
          localStorage.removeItem(item_name);
          tracking_fn(product_id, recommendation_id, false, e);
        } else if (unmatching_tracking) {
          tracking_fn(product_id, recommendation_id!, true, e);
        }
      }
    })
  );
  // @ts-ignore
  button.depict_tracked = true;
}
