import { CallbackableNode, ListenerNames, ObserverCallbackFunction } from "./ElementObserver";
import { ElementObserverEvent } from "./index";
import { catchify } from "../logging/error";

let has_queued_microtask = false;
const queued_callbacks = /*@__PURE__*/ new Map<ElementObserverEvent<any>, ObserverCallbackFunction<any, any>>();

const catchified_deduplicate_and_dispatch = /*@__PURE__*/ catchify(
  deduplicate_and_dispatch,
  "error in observer event processing",
  "error"
);

/**
 * FUNCTION INTERNAL TO ElementObserver, PLEASE DON'T USE/CALL EXTERNALLY.
 * -------
 * Deduplicates observer callback function execution by event name, selector, element and function
 * This is because in this scenario:
 * ```
 * const el = document.createElement("div");
 * const child = document.createElement("span");
 * document.body.append(el);
 * el.append(child);
 * ```
 * The MutationObserver callback will be queued as a microtask (or maybe something a bit faster? anyways it's not synchronous) and therefore the DOM will look like this once the MutationObserver callback is ran:
 * body
 *  div
 *    span
 * And the MutationObserver callback will receive two MutationRecords, one saying that `div` was added to `body` and one saying that `span` was added to `div`.
 * Now consider this case too:
 * ```
 * const el = document.createElement("div");
 * const child = document.createElement("span");
 * el.append(child);
 * document.body.append(el);
 * ```
 * In this case the DOM will look the same but we only get one MutationRecord once the MutationObserver callback is executed.
 * To be able to discover `span` in both cases we need to run div.querySelectorAll("span") which in the last case will make us able to discover `span`.
 * In the first case however this will, since the MutationObserver callback isn't executed synchronously/immediately, yield `span` twice since it was already added to `div` one we got the notification that `div` got added to the DOM.
 * Therefore we de-duplicate all created ElementObserverEvent's that occured during one "tick" of the microtask queue.
 */
export function call_callback_after_deduplication<
  ElemType extends CallbackableNode = HTMLElement,
  SelectorType extends string | CallbackableNode = string | CallbackableNode,
>(callback: ObserverCallbackFunction<ElemType, SelectorType>, ev: ElementObserverEvent<ElemType, SelectorType>) {
  queued_callbacks.set(ev, callback);
  if (!has_queued_microtask) {
    queueMicrotask(catchified_deduplicate_and_dispatch);
  }
}

function deduplicate_and_dispatch() {
  has_queued_microtask = false;

  const deduplication_map = new Map<
    ListenerNames,
    Map<
      string | CallbackableNode,
      Map<CallbackableNode, Map<ObserverCallbackFunction<CallbackableNode>, ElementObserverEvent<CallbackableNode>>>
    >
  >();
  // event_name -> [selector -> [element -> [function, eoe]]]

  for (const [eoe, callback] of queued_callbacks) {
    // put events into structure of maps and sets where they can only exist once
    queued_callbacks.delete(eoe);

    const { event: event_name, selector, element } = eoe;
    if (!event_name) {
      // it's an ifexists callback, doesnt' need deduplication
      call_callback(callback, eoe);
      continue;
    }

    let l2_map = deduplication_map.get(event_name);
    if (!l2_map) {
      l2_map = new Map<
        string | CallbackableNode,
        Map<CallbackableNode, Map<ObserverCallbackFunction<CallbackableNode>, ElementObserverEvent<CallbackableNode>>>
      >();
      deduplication_map.set(event_name, l2_map);
    }

    let l3_map = l2_map.get(selector);
    if (!l3_map) {
      l3_map = new Map<
        CallbackableNode,
        Map<ObserverCallbackFunction<CallbackableNode>, ElementObserverEvent<CallbackableNode>>
      >();
      l2_map.set(selector, l3_map);
    }

    let l4_map = l3_map.get(element);
    if (!l4_map) {
      l4_map = new Map<ObserverCallbackFunction<CallbackableNode>, ElementObserverEvent<CallbackableNode>>();
      l3_map.set(element, l4_map);
    }

    l4_map.set(callback, eoe);
  }

  // go through structure and call callbacks that are left
  for (const [_event_name, l2_map] of deduplication_map) {
    for (const [_selector, l3_map] of l2_map) {
      for (const [_element, callback_set] of l3_map) {
        for (const [callback, eoe] of callback_set) {
          call_callback(callback, eoe);
        }
      }
    }
  }
}

function call_callback<T extends CallbackableNode>(callback: ObserverCallbackFunction<T>, ev: ElementObserverEvent<T>) {
  catchify(callback, "Error in observer callback")(ev);
}
