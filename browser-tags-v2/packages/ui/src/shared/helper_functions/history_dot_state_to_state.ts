import { batch, createEffect, createRenderEffect, createSignal, onCleanup, Signal, untrack } from "solid-js";
import { catchify, instant_exec_on_suspect_history_change } from "@depict-ai/utilishared";
import { PseudoRouter } from "./pseudo_router";

export let lastHistoryDotStateToStateCleanupInfo: undefined | { time: string; stack: string };

/**
 * Makes signals out of values in history.state so that you can use history state as an intuitive storage of application state.
 * @param params_to_default_value an object of keys with a serialisable default value.
 * @param router_ router used to replace state
 * @returns An object with the same keys as provided with the value being a Signal containing the default value. When the signal is set, history.replaceState is called and the key/value is put into history.state. If something else pushes a new state or the state is poped the signal value will update to always be in-line with the value of history.state.
 */
export function history_dot_state_to_state<Param extends string, DefaultValue>(
  params_to_default_value: Record<Param, DefaultValue>,
  router_: PseudoRouter
) {
  const signals = {} as Record<Param, Signal<any>>;
  const entries = Object.entries(params_to_default_value) as [Param, DefaultValue | undefined][];
  const event_handler = catchify(
    (
      what_happened?: "replaceState" | "pushState" | "popstate",
      args?: PopStateEvent | Parameters<typeof history.replaceState> | Parameters<typeof history.pushState>
    ) => {
      // Intentionally always update our signals to the history state to allow external control of SDK state for doing things like https://linear.app/depictai/issue/X-1432/is-this-possible-with-the-depict-sdk
      if (what_happened !== "popstate") return;
      // Had to undo the comment above,but leaving the history. Doing this because discovering why it doesn't work is a deja-vu and I don't want to have to discover it again.
      // If we want others to interface with our state, it's better to expose it from DepictCategory/DepictSearch
      // The reason for that is because writes to the state trigger writes to the state (something about local filter state, see the comment where `last_remote_state !== available_filters_()` happens in create_modified_filters.tsx)
      // And can infinite loop, like in https://app.jiminny.com/playback/569c8f65-edea-4735-bd9e-4eb5a0b14cad
      // It's the classical equilibrium problem when syncing state both down and up, and it's much easier to avoid than solve
      history_state_change(signals, entries, (args as PopStateEvent).state);
    }
  );

  // createRenderEffect because we need the instant execution so the signals always contain values, even before solid's render phase
  createRenderEffect(() => {
    let signal_changed = false;
    let { state: state } = globalThis?.history || { state: {} }; // cloning isn't necessary because we're calling replaceState on it anyway
    if (state === null || typeof state != "object") {
      state = {};
    }

    for (const [param, default_value] of entries) {
      const [read_signal] = (signals[param] ||= createSignal(state[param] ?? default_value));
      const new_value = read_signal();

      if (new_value !== state[param]) {
        signal_changed = true;
        state[param] = new_value;
      }
    }

    if (signal_changed) {
      router_.navigate_.replace_state_(state);
    }
    onCleanup(
      () => (lastHistoryDotStateToStateCleanupInfo = { time: new Date().toISOString(), stack: new Error().stack! })
    );
  });

  // history_dot_state_to_state needs to update after its signals after url_state does BUT in the same task (might even have to be in the same tick in the microtask queue). If we'd use window.addEventListener("popstate") it would be guaranteed to be too late since each event listener has its own task
  instant_exec_on_suspect_history_change.add(event_handler);
  onCleanup(catchify(() => instant_exec_on_suspect_history_change.delete(event_handler)));
  createEffect(catchify(() => untrack(catchify(() => history_state_change(signals, entries, history.state))))); // we need this to run after reading the initial state from history.state to write the defaults to history.state

  return signals;
}

function history_state_change<Param extends string, DefaultValue>(
  signals: Record<Param, Signal<any>>,
  entries: [Param, DefaultValue | undefined][],
  state: typeof history.state
) {
  batch(() => {
    for (const [param, default_value] of entries) {
      const [, write_signal] = signals[param];
      const new_value = state?.[param];
      write_signal(new_value ?? default_value);
    }
  });
}
