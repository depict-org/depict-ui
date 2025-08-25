import { Accessor, createComputed, createMemo, createSignal, on, Signal, untrack } from "solid-js";
import { SearchFilter } from "@depict-ai/types/api/SearchResponse";

export function make_is_open_signal(props: {
  expanded_filters_: Signal<{ section_: string; expanded_: boolean }[]>;
  section_: string;
  filter_array_: Accessor<SearchFilter[]>;
}) {
  const expanded_state_item_in_history_state = createMemo(() =>
    props.expanded_filters_[0]().find(item => item.section_ === props.section_)
  );
  const is_open = createSignal<boolean>(untrack(expanded_state_item_in_history_state)?.expanded_ ?? false);
  const fallback_state_from_api = createMemo(() => {
    const arr = props
      .filter_array_()
      .map(item => item?.meta?.group_expanded)
      .filter(item => typeof item === "boolean") as boolean[];
    const set = new Set(arr);
    if (set.size !== 1) {
      // backend can't decide
      return undefined;
    }
    return arr[0];
  });

  createComputed(
    on(
      expanded_state_item_in_history_state,
      new_state => {
        // this is the most powerful source except for of course the user setting it
        if (new_state) {
          is_open[1](new_state.expanded_);
        }
      },
      { defer: true }
    )
  );

  createComputed(() => {
    // sync from API to actually open if no user set state
    // This is an untested codepath as of Thu Jul 14 17:22:50 CEST 2022
    // Backend hasn't implemented sending group_expanded yet so we have to wait for that to test this
    const new_fallback_state = fallback_state_from_api();
    if (typeof new_fallback_state !== "boolean") {
      return; // ignore
    }
    if (!expanded_state_item_in_history_state()) {
      // there's no user set state, it's free real estate for fallback state
      is_open[1](new_fallback_state);
    }
  });

  createComputed(
    on(
      is_open[0],
      new_state => {
        // update history state if needed when user changes expanded state
        if (!expanded_state_item_in_history_state()) {
          // we're operating in fallback mode
          if (new_state === fallback_state_from_api()) {
            // API fallback state updated which updated us, don't save that in history state (it's only for manual changes)
            return;
          }
        }
        const new_arr = [...props.expanded_filters_[0]()];
        const existing_index = new_arr.indexOf(expanded_state_item_in_history_state()!);
        if (existing_index >= 0) {
          new_arr.splice(existing_index, 1);
        }
        new_arr.push({ section_: props.section_, expanded_: new_state });
        props.expanded_filters_[1](new_arr);
      },
      { defer: true }
    )
  );

  return is_open;
}
