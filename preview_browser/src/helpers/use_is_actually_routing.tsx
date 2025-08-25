import { createComputed, createSignal, onCleanup } from "solid-js";
import { catchify, instant_exec_on_suspect_history_change, queueMacroTask } from "@depict-ai/utilishared/latest";
import { useIsRouting } from "@solidjs/router";

const enum Phase {
  IDLE,
  POPSTATE_OCCURRED,
  IS_ROUTING_AFTER_POPSTATE,
  IS_ROUTING_AFTER_PUSH_OR_REPLACE_STATE,
}

/**
 * Solid-start's useIsRouting is buggy, we do our own instead.
 * The issue with it is that it claims to have finished routing before it has updated location.href (called the History API). This results in our components taking and pushing the wrong URL.
 * Make sure this basically always exists, so create it in the root component and pass it down.
 */
export function use_is_actually_routing() {
  // Idea: cover the cases popstate and replaceState, pushState by using what we know to broadening the is_routing to be true until the browser APIs have been called, where possible
  let phase: Phase = 0;
  const [get_is_actually_routing, set_is_actually_routing] = createSignal(false);
  const is_routing = useIsRouting();
  const handler = (what_happened?: "replaceState" | "pushState" | "popstate") => {
    if (what_happened === "popstate") {
      phase = Phase.POPSTATE_OCCURRED;
      set_is_actually_routing(true);
    } else if (phase === Phase.IS_ROUTING_AFTER_PUSH_OR_REPLACE_STATE) {
      queueMacroTask(
        catchify(() => {
          // Need to wait a microtask with this since solid's router has
          // Edit: microtask doesn't work when clicking on a product card in search results, macrotask does
          /*
         start(() => {
                        setReference(resolvedTo);
                        setState(nextState);
                        resetErrorBoundaries();
                    }).then(() => {
                        if (referrers.length === len) {
                            navigateEnd({
                                value: resolvedTo,
                                state: nextState
                            });
                        }
                    });
                    
         */
          // and we need to wait for the navigateEnd to have been called or something????
          phase = Phase.IDLE;
          set_is_actually_routing(false);
        })
      );
    }
  };

  instant_exec_on_suspect_history_change.add(handler);
  onCleanup(() => instant_exec_on_suspect_history_change.delete(handler));

  createComputed(() => {
    if (is_routing()) {
      set_is_actually_routing(true);
      if (phase === Phase.POPSTATE_OCCURRED) {
        phase = Phase.IS_ROUTING_AFTER_POPSTATE;
      } else {
        phase = Phase.IS_ROUTING_AFTER_PUSH_OR_REPLACE_STATE;
      }
    } else {
      // On popstate, the popstate will happen before solid's is-routing does anything so the best we can do is to just forward solid's signal
      if (phase === Phase.IS_ROUTING_AFTER_POPSTATE) {
        queueMacroTask(
          catchify(() => {
            phase = Phase.IDLE;
            set_is_actually_routing(false);
          })
        );
      }
    }
  });

  return get_is_actually_routing;
}
