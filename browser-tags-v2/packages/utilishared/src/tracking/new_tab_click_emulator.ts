import { dlog } from "../logging/dlog";
import { Display, Node_Array } from "../rendering/recommendation-renderer/types";
import { catchify } from "../logging/error";
import { Promise_Any } from "../utilities/promise_any";

/**
 * Broadcasts the product id of the current page to a BroadcastChannel `right_click_attribution`.
 * This enables a page in another tab where right-clicking on a recommendation yielded to the opening of this page to send click tracking events.
 */
export async function broadcast_product_id(product_id: string) {
  if (typeof BroadcastChannel != "function") {
    return;
  }
  const bc = new BroadcastChannel("right_click_attribution");
  dlog("Broadcasting", product_id, "to", bc);
  bc.postMessage(product_id);
  bc.close();
}

/**
 * This function is a post processor for recommendation renderer which adds a "new tab listener" to the recommendations. That means that it will listen for right-and wheel clicks on the elements and if a tab opens (=broadcasts the product id) of the clicked product it emulates a click event (using contextmenu_callback)
 * @param  elements               Elements that event listeners will be added on
 * @param  display                The display to take the product_id from
 * @param  info                   InfoForProcessing to get Tenant instance out of
 * @return          `elements` 1:1
 */
export function add_new_tab_listener(
  elements: NodeListOf<ChildNode> | Node_Array,
  display: Display,
  info?: any,
  get_event_listener_remover?: (remover: VoidFunction) => void
) {
  if (typeof BroadcastChannel != "function") {
    return elements;
  }
  const disconnectors: VoidFunction[] = [];
  const handler = catchify((e: MouseEvent) =>
    contextmenu_callback(
      e,
      ("variant_index" in display ? display.variant_displays[display.variant_index] : display).product_id
    )
  );
  const auxclick_handler = (e: MouseEvent) => e.button === 1 && handler(e);
  for (let i = 0; i < elements?.length; i++) {
    const element = elements[i];
    (element.addEventListener as GlobalEventHandlers["addEventListener"])("contextmenu", handler);
    (element.addEventListener as GlobalEventHandlers["addEventListener"])("auxclick", auxclick_handler); // actual wheel click - some mouses / OS:es also dispatch auxclick on rightclick
    if (get_event_listener_remover) {
      disconnectors.push(() => {
        (element.removeEventListener as GlobalEventHandlers["addEventListener"])("contextmenu", handler);
        (element.removeEventListener as GlobalEventHandlers["addEventListener"])("auxclick", auxclick_handler);
      });
    }
  }
  get_event_listener_remover?.(() => disconnectors.forEach(disconnector => disconnector()));
  return elements;
}

/**
 * This is the event handler for the new tab tracking function (add_new_tab_listener)
 * @param  e                        Click event
 * @param  product_id               product_id of clicked product
 * @return            A promise resolving to void after 60s or when the product id was broadcasted
 */
export async function contextmenu_callback(e: Event, product_id: string) {
  dlog("Contextmenu was invoked", e);

  const element = (e.currentTarget || e.target)!;
  const bc = new BroadcastChannel("right_click_attribution");

  const got_wanted_event = await Promise_Any([
    new Promise(resolve => {
      bc.addEventListener(
        "message",
        catchify(msg => {
          const { data } = msg;
          dlog("Recieved broadcast channel event", data, msg);
          if (data == product_id) {
            resolve(true);
          }
        })
      );
    }),
    new Promise(r => setTimeout(r, 60 * 1000, false)),
  ]);

  if (got_wanted_event) {
    const click = new MouseEvent("click", {
      view: window,
      bubbles: true,
      cancelable: true,
      metaKey: true,
    });
    dlog(
      "Someone broadcasted our product_id! Simulating a click event on the element that was contextmenu'd",
      element,
      click
    );
    element.addEventListener("click", e => (e.preventDefault(), false), { once: true });
    element.dispatchEvent(click);
  } else {
    dlog("Our product_id did not get broadcasted, closing channel");
  }
  bc.close();
}
