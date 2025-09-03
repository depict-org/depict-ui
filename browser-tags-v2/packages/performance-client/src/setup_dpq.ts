import { PerformanceClient } from "./PerformanceClient";
import { DepictObject, EventName, GA4Purchase } from "./types";

/**
 * Creates an event queue (depict queue)
 */
function create_dpq() {
  const fn: any = function () {
    const args = arguments;
    if (fn.send_event) {
      fn.send_event.apply(this, args);
    } else {
      fn.queue.push(args);
    }
  };
  fn.queue = [];
  return fn;
}

const string_guard = (eventName: string, eventData: unknown): string => {
  if (typeof eventData == "number" && !isNaN(eventData)) {
    return eventData.toString();
  }

  if (typeof eventData !== "string") {
    throw new Error(`${eventName} event requires a string as an argument`);
  }

  return eventData;
};

const nullable_undefined_string_guard = (eventName: string, eventData: unknown): string | undefined | null => {
  if (eventData === null || eventData === undefined) return eventData;

  return string_guard(eventName, eventData);
};

const ga4_purchase_guard = (purchaseEvent: Partial<GA4Purchase>): purchaseEvent is GA4Purchase => {
  if (typeof purchaseEvent !== "object" || purchaseEvent === null) {
    throw new Error("purchase event requires an object as an argument");
  }

  if (!Array.isArray(purchaseEvent.items)) {
    throw new Error("purchase event requires an items array of purchased products");
  } else if (!purchaseEvent.currency || typeof purchaseEvent.currency !== "string") {
    throw new Error("purchase event requires a currency string");
  } else if (
    !purchaseEvent.transaction_id ||
    !(typeof purchaseEvent.transaction_id == "string" || typeof purchaseEvent.transaction_id == "number")
  ) {
    throw new Error("purchase event requires a transaction_id string");
  }

  // Transaction id could be either number or string at this point, automatically convert the latter
  purchaseEvent.transaction_id = purchaseEvent.transaction_id.toString();

  for (const item of purchaseEvent.items) {
    if (
      item.item_id == "" ||
      !(
        typeof item.item_id == "string" ||
        (typeof item.item_id == "number" && !isNaN(item.item_id as unknown as number))
      )
    ) {
      throw new Error("purchased item requires an item_id of the purchased product");
    } else if (isNaN(item.price)) {
      // ^ 0 cost items are valid
      throw new Error("purchase item requires a unit price for the product purchased");
    } else if (!item.quantity || isNaN(item.quantity)) {
      // ^ But 0 quantity items are not
      throw new Error("purchase item requires a quantity of products purchased");
    }

    // Item id could be either number or string at this point, automatically convert the latter
    item.item_id = item.item_id.toString();
  }

  return true;
};

/**
 * Handle events from dpq with the global dpc instance.
 */
const event_handler = (dpc: PerformanceClient, eventName: EventName, eventData: any) => {
  // take passed DPC since the window.depict object might have been overridden
  if (eventName === "purchase") {
    if (!ga4_purchase_guard(eventData)) {
      // Inaccessible since ga4_purchase_guard will throw an error, TS doesn't know that
      return;
    }

    dpc.sendPurchaseEvent(eventData);
    return;
  }

  // All events below require strings as argument, accept numbers and automatically convert them
  if (typeof eventData == "number") {
    eventData = eventData.toString();
  }

  if (eventName === "addToCart") {
    dpc.sendAddToCartEvent({ product_id: string_guard(eventName, eventData) });
  } else if (eventName === "setMarket") {
    dpc.setMarket(string_guard(eventName, eventData));
  } else if (eventName === "setProductId") {
    dpc.setProductId(string_guard(eventName, eventData));
  } else if (eventName === "setSessionId") {
    dpc.setSessionId(nullable_undefined_string_guard(eventName, eventData));
  }
};

/**
 * Hooks up Depict Queue (dpq) to Depict Performance Client (dpc).
 * Creates dpq if it doesn't exist.
 */
export const setup_dpq = (dpc: PerformanceClient) => {
  const dpq = (globalThis.dpq ||= create_dpq());
  const depict = (globalThis.depict ||= {} as DepictObject);
  depict.dpq = dpq; // refrencing dpq into the depict object
  depict.eventHistory = dpq.queue; // making this more visible in the depict object
  depict.dpc = dpc;

  // Hook up the depict queue to the PerformanceClient
  if (!dpq.send_event) {
    dpq.send_event = (eventName: EventName, eventData: unknown) => {
      dpq.queue.push([eventName, eventData]); // push to queue as usual to keep history
      event_handler(dpc, eventName, eventData); // hand-over to the PerformanceClient
    };
    // Handle any events queued before this code ran.
    dpq.queue.forEach(([eventName, eventData]) => {
      event_handler(dpc, eventName, eventData);
    });
  }
};
