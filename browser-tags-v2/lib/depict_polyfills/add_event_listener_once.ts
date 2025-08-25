export function polyfill_aev_once_if_needed() {
  try {
    if (!supports_once()) {
      const event_to_element_to_polyfilled_to_actual_event_listener: {
        [key: string]: Map<EventTarget, Map<EventListenerOrEventListenerObject, EventListenerOrEventListenerObject>>;
      } = {};

      // inspired by https://github.com/github/eventlistener-polyfill/blob/main/src/index.js#L76 which I unfortunately discovered too late :(((((
      if (typeof EventTarget !== "undefined") {
        polyfill_once(EventTarget.prototype, event_to_element_to_polyfilled_to_actual_event_listener);
      } else {
        polyfill_once(Text.prototype, event_to_element_to_polyfilled_to_actual_event_listener);
        polyfill_once(HTMLElement.prototype, event_to_element_to_polyfilled_to_actual_event_listener);
        polyfill_once(HTMLDocument.prototype, event_to_element_to_polyfilled_to_actual_event_listener);
        polyfill_once(Window.prototype, event_to_element_to_polyfilled_to_actual_event_listener);
        polyfill_once(XMLHttpRequest.prototype, event_to_element_to_polyfilled_to_actual_event_listener);
      }
    }
  } catch (e) {
    console.log(e);
  }
}

function polyfill_once(
  prototype,
  event_to_element_to_polyfilled_to_actual_event_listener: {
    [key: string]: Map<EventTarget, Map<EventListenerOrEventListenerObject, EventListenerOrEventListenerObject>>;
  }
) {
  prototype.addEventListener = new Proxy(prototype.addEventListener, {
    apply(target, this_arg: EventTarget, arguments_list: Parameters<typeof addEventListener>) {
      if (arguments_list?.length > 2) {
        const options = arguments_list?.[2];
        if (typeof options == "object" && options.once) {
          const fn = arguments_list?.[1];
          const ev = arguments_list?.[0];
          if (
            (typeof fn == "function" || (typeof fn == "object" && typeof fn.handleEvent == "function")) &&
            typeof ev == "string"
          ) {
            const event_target_to_map_map = (event_to_element_to_polyfilled_to_actual_event_listener[ev] ||= new Map());
            let function_to_function_map = event_target_to_map_map.get(this_arg);
            if (!function_to_function_map) {
              event_target_to_map_map.set(this_arg, (function_to_function_map = new Map()));
            }
            const oldmapvalue = function_to_function_map.get(fn);
            if (
              typeof oldmapvalue != "function" &&
              (typeof oldmapvalue != "object" || typeof oldmapvalue.handleEvent != "function")
            ) {
              // if someone is trying to add a function as event listener twice, the browser will ignore the second call, therefore we shall only react on the first one
              const proxied_handler = (arguments_list[1] = new Proxy(fn, {
                get(target, property) {
                  const value = target[property];
                  if (property == "handleEvent" && typeof value == "function") {
                    return new Proxy(value, {
                      apply(inner_target, inner_this, inner_arguments_list) {
                        try {
                          this_arg.removeEventListener(ev, fn);
                        } catch (e) {
                          console.log(e);
                        }
                        return inner_target.apply(inner_this, inner_arguments_list);
                      },
                    });
                  }
                  return value;
                },
                apply(inner_target: EventListener, inner_this, inner_arguments_list) {
                  try {
                    this_arg.removeEventListener(ev, fn);
                  } catch (e) {
                    console.log(e);
                  }
                  return inner_target.apply(inner_this, inner_arguments_list);
                },
              }));

              function_to_function_map.set(fn, proxied_handler);
            } else {
              // we need to change the function to the one we already added for deduplication by the browser - alternatively we could just ignore the call entirely
              arguments_list[1] = oldmapvalue;
            }
            // on firefox 48 removeEventListener LEGIT STOPS WORKING if a third option is provided. Clean up options as much as possible to avoid this.
            // we are doing this even if we won't act on the event as we trust that we already registered the first time
            // if we let "once" slip through then it will be impossible to ever remove the event listener
            delete options["once"];
            if (!Object.keys(options).length) {
              arguments_list.splice(2, 1);
            }
          }
        }
      }
      return target.apply(this_arg, arguments_list);
    },
  });

  prototype.removeEventListener = new Proxy(prototype.removeEventListener, {
    apply(target, this_arg: EventTarget, arguments_list: Parameters<typeof removeEventListener>) {
      try {
        if (arguments_list?.length > 1) {
          const [event, fn] = arguments_list;
          if (typeof event == "string") {
            const element_to_polyfilled_to_actual_event_listener =
              event_to_element_to_polyfilled_to_actual_event_listener[event];
            if (element_to_polyfilled_to_actual_event_listener instanceof Map) {
              const polyfilled_to_actual_event_listener = element_to_polyfilled_to_actual_event_listener.get(this_arg);
              if (polyfilled_to_actual_event_listener instanceof Map) {
                const actually_added_event_listener = polyfilled_to_actual_event_listener.get(fn)!;

                // clean up
                polyfilled_to_actual_event_listener.delete(fn);
                if (!polyfilled_to_actual_event_listener.size) {
                  element_to_polyfilled_to_actual_event_listener.delete(this_arg);
                  if (!element_to_polyfilled_to_actual_event_listener.size) {
                    delete event_to_element_to_polyfilled_to_actual_event_listener[event];
                  }
                }

                arguments_list[1] = actually_added_event_listener;
                return target.apply(this_arg, arguments_list);
              }
            }
          }
        }
      } catch (e) {
        console.log(e);
      }
      return target.apply(this_arg, arguments_list);
    },
  });
}

function supports_once() {
  let counter = -1;
  // const t = new EventTarget();
  // if eventtarget is chosen to be polyfilled in the future, i.e. by https://github.com/benlesh/event-target-polyfill/blob/master/index.js, use EventTarget instead of a div
  const t = document.createElement("div");
  t.addEventListener("test", () => counter++, { once: true });
  const send_test_event = () => t.dispatchEvent(new CustomEvent("test"));
  send_test_event();
  send_test_event();
  return !counter;
}
