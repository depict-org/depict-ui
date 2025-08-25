import { call_callback_after_deduplication } from "./observer_event_deduplicator";
import { ElementObserverEvent } from "./ElementObserverEvent";
import { patched_querySelectorAll } from "../utilities/patched_querySelectorAll";
import { catchify, report } from "../logging/error";
import { dlog } from "../logging/dlog";

export interface ElementObserver {
  /**
   * Immediately calls the callback with an ElementObserverEvent for nodes existing in the DOM that match the provided selector OR are the selector,
   * also calls the callback with an ElementObserverEvent whenever ANYTHING in the DOM occurs that makes an element match the provided selector.
   * @param selector Selector string or element to listen for
   * @param callback Function that will be called with the ElementObserverEvent. Exceptions and promise rejections of the callback will be caught and sent to sentry.
   */
  onexists: EO_listener_also_taking_els;
  /**
   * Dispatches an ElementObserverEvent whenever a node is added to the DOM that matches the specified selector OR is the selector.
   * @param selector CSS selector or element to observe
   * @param callback Function that will be called with the ElementObserverEvent. Exceptions and promise rejections of the callback will be caught and sent to sentry.
   **/
  oncreation: EO_listener_also_taking_els;
  /**
   * Dispatches an ElementObserverEvent whenever a node is removed from the DOM that matches the specified selector OR is the selector.
   * @param selector CSS selector or element to observe
   * @param callback Function that will be called with the ElementObserverEvent. Exceptions and promise rejections of the callback will be caught and sent to sentry.
   */
  onremoved: EO_listener_also_taking_els;
  /**
   * Dispatches an ElementObserverEvent whenever a node that matches the specified selector or its children change in the DOM.
   * @param selector CSS selector or element to observe
   * @param callback Function that will be called with the ElementObserverEvent. Exceptions and promise rejections of the callback will be caught and sent to sentry.
   */
  onchange: EO_listener;
  /**
   * Immediately calls the callback with an ElementObserverEvent on nodes that match the provided selector OR are the selector.
   * @param selector Selector string or element to look for in the DOM
   * @param callback Function that will be called with the ElementObserverEvent. Exceptions and promise rejections of the callback will be caught and sent to sentry.
   */
  ifexists: EO_listener_also_taking_els;
  /**
   * Adds a territory to the observer. The observer will observe all elements in the new territory and the one it observed before. `ifexists` checks made in the past won't be made again. Add your shadow roots here on creation and `observer` will finds elements in them.
   */
  add_territory: (what: HTMLElement | Document | DocumentFragment) => void;
  /**
   * Removes a territory again. Useful for no longer observing shadow roots.
   */
  remove_territory: (what: HTMLElement | Document | DocumentFragment) => void;
  /**
   * See docs for observer.onexists. Will return a Promise that resolves to the element out of the first call of an observer.onexists callback.
   * @param selector Selector string or element to wait for
   * @param timeout timeout to stop listening and resolve the Promise with `undefined`
   */
  wait_for_element: <ElemType extends HTMLElement = HTMLElement>(
    selector: string | ElemType,
    timeout?: number
  ) => Promise<ElemType>;
  /**
   * See docs for observer.on<listener>. Will return a Promise that resolves to the first element that matches the given listener and selector. I.e. `wait_for_listener("removed", ".old-recs");` will resolve to the first element matching `.old-recs` that is removed from the DOM
   * @param listener one of the possible functions on ElementObserver that start with "on", without the "on". So "creation", "change", "exists" or "removed"
   * @param selector String containing CSS selector
   * @param timeout timeout to stop listening and resolve the Promise with `undefined`
   */
  wait_for_listener: <ElemType extends HTMLElement = HTMLElement, SelectorType = string | CallbackableNode>(
    listener: SelectorType extends CallbackableNode
      ? "creation" | "removed"
      : "exists" | "creation" | "removed" | "change",
    selector: SelectorType,
    timeout?: number
  ) => Promise<ElemType>;
}
// Known issues:
// For a selector like a.b c
// If it starts out as a.x c and then changes to a.b c, onexists won't fire even though now an element matchign the selector exists
// I don't think that would be easy to fix without a lot of overhead though
export class ElementObserver {
  #the_mutation_observer: MutationObserver | undefined;
  #observing: Partial<
    Record<ListenerNames, Map<string | WeakRef<CallbackableNode>, Set<ObserverCallbackFunction<any, any>>>>
  > = {};
  readonly #self_proxied: ElementObserver;
  #observer_callback_running = false;
  #execute_after_callback_ran: VoidFunction[] = [];
  #attribute_attribution_map_object: {
    [key: string]: WeakSet<CallbackableNode>;
  } = {};
  #territories: (HTMLElement | Document | DocumentFragment)[] =
    typeof document === "object" ? [document.documentElement] : [];
  #listeners = ["exists", "creation", "removed", "change"] as const;
  #weakref_finalization_registry =
    typeof FinalizationRegistry === "function" &&
    new FinalizationRegistry<readonly [ListenerNames, WeakRef<CallbackableNode>]>(
      catchify(this.#finalization_registry_callback.bind(this))
    );
  #verbs = {
    // add "normal" functions for the class that can be used as i.e. observer.ifexists() here

    ifexists: <
      ElemType extends CallbackableNode = HTMLElement,
      SelectorType extends string | CallbackableNode = string | CallbackableNode,
    >(
      selector: SelectorType,
      callback: ObserverCallbackFunction<ElemType, SelectorType>
    ) => {
      const territories = this.#territories;
      this.#check_observer_args(selector, callback, true);

      if (typeof document === "undefined") return; // SSR

      const our_set = (this.#attribute_attribution_map_object[selector as unknown as string] ||= new WeakSet());

      if (selector instanceof Node) {
        let node_is_contained = false;
        for (let i = 0; i < territories.length; i++) {
          if (!territories[i].contains(selector)) continue;
          node_is_contained = true;
          break;
        }

        if (node_is_contained) {
          our_set.add(selector as CallbackableNode); // Add element to set, so we don't dispatch two onexists events for it if it matches the selector and an attribute changes in the same go
          // When the selector is a node the selector and the element are the same, dunno how we could reflect that in the typing though
          this.#call_callbacks<ElemType, ElemType>(
            [callback as unknown as ObserverCallbackFunction<ElemType, ElemType>],
            callback_ => ({
              element_: selector as unknown as ElemType,
              selector_: selector as unknown as ElemType, // ts is being stupid here because it doesn't understand that everything in string | Text | Element | Comment that's a node is Text | Element | Comment
              disconnector_: this.#disconnect_fn<CallbackableNode, CallbackableNode>({
                event_: "exists",
                selector_: new WeakRef(selector as CallbackableNode),
                callback_: callback_ as unknown as ObserverCallbackFunction<CallbackableNode, CallbackableNode>,
              }),
            })
          );
        }
        return;
      }

      for (let i = 0; i < territories.length; i++) {
        const found = patched_querySelectorAll<Element>(territories[i], selector);
        if (!found) continue;
        for (let j = 0; j < found.length; j++) {
          const element = found[j];
          our_set.add(element);
          this.#call_callbacks<ElemType, string>(
            [callback as ObserverCallbackFunction<ElemType, string>],
            callback_ => ({
              element_: element as ElemType,
              selector_: selector,
              disconnector_: this.#disconnect_fn({
                event_: "exists",
                selector_: selector,
                callback_,
              }),
            })
          );
        }
      }
    },
    wait_for_element: (selector: string | CallbackableNode, timeout: number) => {
      return this.#self_proxied.wait_for_listener("exists", selector, timeout);
    },
    wait_for_listener: (listener: string, selector: string, timeout: number) => {
      this.#check_observer_args(listener, () => {}, false);
      // console.log("waiting for listener", listener, "selector", selector, "timeout", timeout);
      return new Promise<CallbackableNode | undefined>(
        catchify(r => {
          const stop_observing = this.#self_proxied["on" + listener](selector, ({ element, disconnector }) => {
            r(element);
            disconnector();
            if (timeout) {
              clearTimeout(obs_timeout);
            }
          });
          if (timeout) {
            var obs_timeout = setTimeout(() => {
              stop_observing();
              r(undefined);
            }, timeout);
          }
        })
      );
    },
    add_territory: (what: HTMLElement | Document | DocumentFragment) => {
      this.#territories.push(what);
      // If mutation observer was already started, add element to what it observes
      this.#the_mutation_observer?.observe(what, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeOldValue: true,
        characterData: true,
        characterDataOldValue: true,
      });
    },
    remove_territory: (what: HTMLElement | Document | DocumentFragment) => {
      const new_value = this.#territories.filter(item => item !== what);
      this.#territories = [];
      // There's no .unobserve so disconnect the whole observer and then re-add everything except the removed territory
      this.#the_mutation_observer?.disconnect();
      for (let i = 0; i < new_value.length; i++) {
        this.#verbs.add_territory(new_value[i]);
      }
    },
  };
  #kickstart_observer() {
    if (typeof document === "undefined") return;
    this.#the_mutation_observer = new MutationObserver(this.#observer_callback);
    const territories = this.#territories;

    for (let i = 0; i < territories.length; i++) {
      this.#the_mutation_observer.observe(territories[i], {
        attributes: true,
        childList: true,
        subtree: true,
        attributeOldValue: true,
        characterData: true,
        characterDataOldValue: true,
      });
    }
  }

  #disconnect_fn<
    ElemType extends CallbackableNode = HTMLElement,
    SelectorType extends string | CallbackableNode = string | CallbackableNode,
  >({
    event_,
    selector_,
    callback_,
  }: {
    event_: "exists" | "creation" | "removed" | "change";
    selector_: SelectorType extends CallbackableNode ? WeakRef<CallbackableNode> : string;
    callback_: ObserverCallbackFunction<ElemType, SelectorType>;
  }) {
    return () => {
      const fn = () => {
        const observing = this.#observing;
        const selector_to_callback_array_map = observing[event_];
        if (!selector_to_callback_array_map) {
          return;
        }

        const callbacks = selector_to_callback_array_map.get(selector_);
        callbacks?.delete(callback_);

        if (callbacks?.size === 0) {
          selector_to_callback_array_map.delete(selector_);
        }

        if (selector_to_callback_array_map.size === 0) {
          delete observing[event_];
        }

        if (!Object.keys(observing).length) {
          this.#the_mutation_observer?.disconnect();
          this.#the_mutation_observer = undefined;
        }
      };
      // If the observer callback is running, we need to queue every function that mutates this.#observing since we can't clone it for performance reasons
      if (this.#observer_callback_running) {
        this.#execute_after_callback_ran.push(fn);
      } else {
        fn();
      }
    };
  }

  #observer_callback = (records: MutationRecord[]) => {
    // this is the function which needs to be as fast as possible because it is called on EVERY mutation in the DOM
    try {
      this.#observer_callback_running = true;
      const steps_to_restore_observing_cache: VoidFunction[] = [];
      try {
        const observing = this.#observing; // Currently observing elements. Please make sure they don't get mutated by anything except this function during the running of this function (use observer_callback_running and #execute_after_callback_ran to check for and schedule your mutations for after the run of this function). We previously cloned these on every run but that's super slow.
        const attribute_attribution_map_object = this.#attribute_attribution_map_object;

        for (let j = 0; j < records.length; j++) {
          const record = records[j];
          const { addedNodes, removedNodes, target } = record;
          const events_for_discovery: ("creation" | "exists" | "change")[] = [];
          let nodes_to_check: Node[] | NodeList;

          // code for handling a record containing wanted elements in addedNodes or the children of added nodes and attribute changes that make an existing node match a selector, mainly for oncreation and onexists, but it will fire onchange if someone is listening if an attribute change makes an element match a selector
          if (!addedNodes.length && !removedNodes.length) {
            nodes_to_check = [target];
          } else {
            nodes_to_check = addedNodes;
            if (observing["creation"]) {
              events_for_discovery.push("creation");
            }
          }
          if (observing["exists"]) {
            events_for_discovery.push("exists");
          }
          if (observing["change"]) {
            events_for_discovery.push("change");
          }
          for (let n = 0; n < events_for_discovery.length; n++) {
            const event = events_for_discovery[n];
            const event_is_creation_or_exists_with_tree_change =
              event === "creation" || (event === "exists" && addedNodes.length);
            const selector_map = observing[event];
            const selectors = [...selector_map!.keys()]; // we can only iterate over a MapIterator once, so we need to spread it
            if (event === "change" && (addedNodes.length || removedNodes.length)) {
              // we check the selectors first because I'm DUMB and already have come so far
              for (let selectors_i = 0; selectors_i < selectors.length; selectors_i++) {
                const selector = selectors[selectors_i];
                // @ts-ignore
                if (target?.matches?.(selector)) {
                  // we WANT change event and there are children to an element that interests us - act on it
                  const callbacks = selector_map!.get(selector)!;
                  this.#call_callbacks(callbacks, callback => ({
                    element_: target as Element, // it has to be an *Element* since it has
                    // the selector is a string since the event is change
                    // @ts-ignore
                    selector_: selector,
                    event_: event,
                    mutation_record_: record,
                    disconnector_: this.#disconnect_fn({
                      event_: event,
                      selector_: selector,
                      callback_: callback,
                    }),
                  }));
                  selector_map!.delete(selector);
                  steps_to_restore_observing_cache.push(() => selector_map!.set(selector, callbacks));
                }
              }
              break;
            }
            for (let i = 0; i < nodes_to_check.length; i++) {
              const node = nodes_to_check[i];
              for (let selectors_i = 0; selectors_i < selectors.length; selectors_i++) {
                const selector = selectors[selectors_i];
                const callbacks = selector_map!.get(selector) || new Set();

                if (typeof selector !== "string") {
                  // oncreation or onexists with node-selector
                  if (event_is_creation_or_exists_with_tree_change) {
                    const derefed_el = selector.deref();
                    if (!derefed_el) {
                      selector_map!.delete(selector);
                      // here it's actually OK to mutate this.#observing since no need to keep the empty WeakRef
                      continue;
                    }
                    if (node === derefed_el || node.contains(derefed_el)) {
                      // node is node or node is child of added node
                      this.#call_callbacks(callbacks, callback => ({
                        element_: derefed_el,
                        selector_: derefed_el,
                        event_: event,
                        mutation_record_: record,
                        disconnector_: this.#disconnect_fn({
                          event_: event,
                          selector_: selector,
                          callback_: callback,
                        }),
                      }));
                    }
                  }
                  continue;
                }

                // @ts-ignore
                const matches_now = node?.matches?.(selector);

                let our_set: WeakSet<Node>;
                if (event == "exists") {
                  // we want the change event to trigger to any change (exists only if it makes an element match a selector that didn't previously match)
                  our_set = attribute_attribution_map_object[selector] ||= new WeakSet<Node>();

                  if (record.type === "attributes" && matches_now != null) {
                    const matched_last = our_set.has(node);

                    if (matched_last && matches_now) {
                      // do not trigger on unrelated attribute changes, this is the reason for the set
                      continue;
                    }
                  }

                  if (matches_now) {
                    our_set.add(node);
                  } else {
                    our_set.delete(node);
                  }
                }

                if (matches_now) {
                  this.#call_callbacks(callbacks, callback => ({
                    element_: node as Element,
                    selector_: selector,
                    event_: event,
                    mutation_record_: record,
                    disconnector_: this.#disconnect_fn({
                      event_: event,
                      selector_: selector,
                      callback_: callback,
                    }),
                  }));
                }
                if (
                  (addedNodes.length || removedNodes.length) &&
                  node.hasChildNodes() /* it is possible to add an element that already has children */ &&
                  // @ts-ignore
                  node.querySelectorAll /* don't act on i.e. textnodes. Doing the check this way is actually faster than both `in` and instanceof */
                ) {
                  const matching_children = patched_querySelectorAll(node as Element, selector)!;
                  for (let m = 0; m < matching_children.length; m++) {
                    // always use for loops because this can't be slow and forEach takes ages
                    if (event == "exists") {
                      our_set!.add(matching_children[m]);
                    }
                    this.#call_callbacks(callbacks, callback => ({
                      element_: matching_children[m] as Element,
                      selector_: selector,
                      event_: event,
                      mutation_record_: record,
                      disconnector_: this.#disconnect_fn({
                        event_: event,
                        selector_: selector,
                        callback_: callback,
                      }),
                    }));
                  }
                }
              }
            }
          }

          // code for handling changes to children of an observed element
          {
            const event = "change";
            const selector_map = observing[event];
            if (selector_map) {
              let target_el = target as Node | undefined | null;
              while ((target_el = target_el?.parentNode)) {
                // @ts-ignore
                if (target_el?.matches) {
                  for (const selector of selector_map.keys()) {
                    // selector is string because event is change
                    // @ts-ignore
                    if ((target_el as Element).matches?.(selector)) {
                      const callbacks = selector_map.get(selector)!;
                      this.#call_callbacks(callbacks, callback => ({
                        element_: target_el as Element,
                        // @ts-ignore
                        selector_: selector,
                        event_: event,
                        mutation_record_: record,
                        disconnector_: this.#disconnect_fn({
                          event_: event,
                          selector_: selector,
                          callback_: callback,
                        }),
                      }));
                      // Since we now deduplicate
                      steps_to_restore_observing_cache.push(() => selector_map.set(selector, callbacks));
                    }
                  }
                }
              }
            }
          }

          // code for observing observed elements disappearing
          {
            const event = "removed";
            const removed_map = observing[event];
            if (removed_map && removedNodes?.length) {
              const selectors = [...removed_map.keys()];
              for (let t = 0; t < removedNodes.length; t++) {
                for (let u = 0; u < selectors.length; u++) {
                  const selector = selectors[u];
                  const callbacks = removed_map.get(selector) || new Set();
                  const node = removedNodes[t];
                  if (typeof selector === "string") {
                    const matching_nodes: Element[] = [];
                    // @ts-ignore
                    if (node?.matches?.(selector)) {
                      matching_nodes.push(node as Element);
                    }
                    matching_nodes.push(...(patched_querySelectorAll(node as Element, selector) || []));
                    for (let v = 0; v < matching_nodes.length; v++) {
                      this.#call_callbacks(callbacks, callback => ({
                        element_: matching_nodes[v],
                        selector_: selector,
                        event_: event,
                        mutation_record_: record,
                        disconnector_: this.#disconnect_fn({
                          event_: "removed",
                          selector_: selector,
                          callback_: callback,
                        }),
                      }));
                    }
                  } else {
                    const derefed_el = selector.deref();
                    if (derefed_el) {
                      if (node === derefed_el || node.contains(derefed_el)) {
                        this.#call_callbacks(callbacks, callback => ({
                          element_: derefed_el,
                          mutation_record_: record,
                          selector_: derefed_el,
                          event_: event,
                          disconnector_: this.#disconnect_fn({
                            event_: event,
                            selector_: selector,
                            callback_: callback,
                          }),
                        }));
                      }
                    } else {
                      // here it's also ok to mutate #observing since the WeakRef is empty
                      removed_map.delete(selector);
                    }
                  }
                }
              }
            }
          }
        }
        // const end = new Date().getTime();
        // console.log("procesed",records.length,"in", end-start, this.#observing);
      } finally {
        // ensure that we don't leave this.#observing in a broken state if we throw
        while (steps_to_restore_observing_cache.length) {
          steps_to_restore_observing_cache.pop()!();
        }
        const execute_after_run = this.#execute_after_callback_ran;
        // We need to execute these in order they were added because I'm afraid that things might rely on it
        for (let i = 0; i < execute_after_run.length; i++) {
          try {
            execute_after_run[i]();
          } catch (e) {
            report([e, "error in observer running queued function"], "error");
          }
        }
        // Let the garbage collector empty the old array by creating a new one
        this.#execute_after_callback_ran = [];
        this.#observer_callback_running = false;
      }
    } catch (e) {
      report([e, "error in observer"], "error");
    }
  };

  #check_observer_args<
    ElemType extends CallbackableNode = HTMLElement,
    SelectorType extends string | CallbackableNode = string | CallbackableNode,
  >(selector: SelectorType, callback: ObserverCallbackFunction<ElemType, SelectorType>, allow_nodes: boolean) {
    if (
      (!allow_nodes && typeof selector !== "string") ||
      (allow_nodes && !(selector instanceof Node) && typeof selector !== "string")
    ) {
      throw new Error("no or invalid selector specified");
    }
    if (typeof callback !== "function") {
      throw new Error("no callback specified");
    }
  }
  #add_listener(listener: ListenerNames) {
    // called when observer.onsomethinglistener() is called, somethinglistener being something in this.#listeners
    const the_class = this;
    const function_for_listener = <T extends CallbackableNode>(
      selector: string | CallbackableNode,
      callback: ObserverCallbackFunction<T>
    ) => {
      if (typeof Node !== "function") {
        // We are probably running on the server where we can't do anything anyway so we might just return
        return;
      }
      if (!listener || !selector || !callback) {
        dlog("listener, selector or callback is falsey", { listener, selector, callback });
        return;
      }
      the_class.#check_observer_args(selector, callback, listener != "change");

      if (the_class.#observer_callback_running) {
        // Can't mutate #observing right now, queue it for when we can
        the_class.#execute_after_callback_ran.push(() => function_for_listener(selector, callback));
        return;
      }

      const observing = the_class.#observing;
      observing[listener] ||= new Map<
        string | WeakRef<CallbackableNode>,
        Set<ObserverCallbackFunction<CallbackableNode>>
      >();
      // create map for each listener, this is because the selectors can be objects for .onremoved, .oncreation and .onexists to take explicit nodes
      const selector_map = observing[listener]!;
      let disconnector: VoidFunction;

      if (listener === "exists") {
        the_class.#verbs.ifexists(selector, callback as ObserverCallbackFunction<Element>);
      }

      if (typeof selector === "string") {
        // simple code for string selectors
        let callback_set = selector_map.get(selector);
        if (!callback_set) {
          callback_set = new Set<ObserverCallbackFunction<CallbackableNode>>();
          selector_map.set(selector, callback_set);
        }
        callback_set.add(callback); // we make this a set since you're not supposed to be able to have the same function as listener twice, like you can't with addEventListener

        disconnector = the_class.#disconnect_fn({
          event_: listener,
          selector_: selector,
          callback_: callback,
        });
      } else {
        // for an element "selector" we don't want to keep strong references to the nodes as that would prevent them from being garbage collected
        let callback_set_to_add_to: Set<ObserverCallbackFunction<any, any>> | undefined;
        for (const [stored_selector, existing_callback_set] of selector_map) {
          // try finding an existing array of callbacks
          if (typeof stored_selector === "string") {
            continue;
          }
          const ref_contents = stored_selector.deref();
          if (!ref_contents) {
            // clean up listeners for selectors that have already been GC'd
            selector_map.delete(stored_selector);
            continue;
          }
          if (ref_contents === selector) {
            callback_set_to_add_to = existing_callback_set;

            disconnector = the_class.#disconnect_fn({
              event_: listener,
              selector_: stored_selector,
              callback_: callback,
            });

            break;
          }
        }
        if (!callback_set_to_add_to) {
          callback_set_to_add_to = new Set<ObserverCallbackFunction<CallbackableNode>>();
          const weakref = new WeakRef(selector);
          the_class.#cleanup_weakref_when_refd_el_gcd(listener, weakref, selector);
          selector_map.set(weakref, callback_set_to_add_to);

          disconnector = the_class.#disconnect_fn({
            event_: listener,
            selector_: weakref,
            callback_: callback,
          });
        }
        callback_set_to_add_to.add(callback);
      }

      if (!the_class.#the_mutation_observer) {
        the_class.#kickstart_observer();
      }

      return disconnector!;
    };
    return function_for_listener;
  }

  #cleanup_weakref_when_refd_el_gcd(
    listener: ListenerNames,
    weakref: WeakRef<CallbackableNode>,
    element: CallbackableNode
  ) {
    // we don't want to keep references to elements used as "selectors" in oncreation and onremoved
    if (!this.#weakref_finalization_registry) {
      return;
    }
    this.#weakref_finalization_registry.register(element, [listener, weakref] as const);
  }

  #finalization_registry_callback([listener, weak_ref]: [ListenerNames, WeakRef<CallbackableNode>]) {
    // element was GCd and the callbacks can never be called, remove them
    const observing = this.#observing;
    observing[listener]?.get(weak_ref)?.clear(); // just in case something still has a reference to this set and does something with it, clear it
    observing[listener]?.delete(weak_ref);
    if (observing[listener]?.size === 0) {
      delete observing[listener];
    }
    if (Object.keys(observing).length === 0) {
      this.#the_mutation_observer?.disconnect();
      this.#the_mutation_observer = undefined;
    }
  }

  #call_callbacks<
    ElemType extends CallbackableNode = HTMLElement,
    SelectorType extends string | CallbackableNode = string | CallbackableNode,
  >(
    callbacks: Iterable<ObserverCallbackFunction<ElemType, SelectorType>>,
    make_ev_data: (
      callback: ObserverCallbackFunction<ElemType, SelectorType>
    ) => ConstructorParameters<typeof ElementObserverEvent<ElemType, SelectorType>>[0]
  ) {
    for (const callback of callbacks) {
      call_callback_after_deduplication(
        callback,
        new ElementObserverEvent<ElemType, SelectorType>(make_ev_data(callback))
      );
    }
  }

  #get(
    target: ElementObserver,
    verb:
      | "onexists"
      | "oncreation"
      | "onremoved"
      | "onchange"
      | "ifexists"
      | "wait_for_element"
      | "wait_for_listener"
      | "add_territory"
      | "remove_territory"
  ) {
    // @ts-ignore
    const is_listener = target.#listeners.includes(verb.slice(2));
    const is_verb = Object.keys(target.#verbs).includes(verb);
    if (is_verb) {
      return target.#verbs[verb];
    } else if (is_listener) {
      return target.#add_listener(verb.slice(2) as ListenerNames);
    } else {
      throw new Error(
        "Property " +
          verb +
          " is not valid. Valid listeners: " +
          target.#listeners.join(", ") +
          "; valid verbs: " +
          Object.keys(target.#verbs).join(", ")
      );
    }
  }

  constructor({
    territory,
  }: {
    territory?: HTMLElement | Document | DocumentFragment | (HTMLElement | Document | DocumentFragment)[];
  } = {}) {
    if (process.env.BUILD_TARGET !== "modern" && Proxy.toString().indexOf("[native code]") === -1) {
      this.#listeners.forEach(listener => (this["on" + listener] = () => {})); // define listeners, needed for IE11 proxy polyfill
      Object.keys(this.#verbs).forEach(listener => (this[listener] = () => {}));
    }

    if (territory) {
      this.#territories = Array.isArray(territory) ? territory : [territory];
    }

    return (this.#self_proxied = new Proxy(this, { get: this.#get }));
  }
}

type EO_listener = <ElemType extends HTMLElement = HTMLElement>(
  selector: string,
  callback: ObserverCallbackFunction<ElemType>
) => Disconnector;
type EO_listener_also_taking_els = <
  ElemType extends CallbackableNode = HTMLElement,
  SelectorType extends string | CallbackableNode = string | CallbackableNode,
>(
  selector: SelectorType,
  callback: ObserverCallbackFunction<ElemType, SelectorType>
) => Disconnector;
export type ListenerNames = "exists" | "creation" | "removed" | "change";
export type ObserverCallbackFunction<
  ElemType extends CallbackableNode,
  SelectorType extends string | CallbackableNode = string | CallbackableNode,
> = (event: ElementObserverEvent<ElemType, SelectorType>) => any;
export type Disconnector = () => unknown;
export type CallbackableNode = Element | Text | Comment;
