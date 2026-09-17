import {
  Accessor,
  batch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  Setter,
  Signal,
  untrack,
} from "solid-js";
import { instant_exec_on_suspect_history_change } from "@depict-ai/utilishared";

export type SearchFieldValue = {
  value_: Signal<string>;
  /**
   * Shows submitted_query in the fields while the history entry being left keeps query_of_current_history_entry. Ends when the URL carries the submitted query, when the returned function is called or on popstate.
   * @returns a function ending the submit, returning whether the submit landed (as opposed to having been aborted or superseded)
   */
  begin_submit_: (submitted_query: string, query_of_current_history_entry: string) => () => boolean;
  /** Persists the given query, unless a submit is pending */
  settle_: (query: string) => void;
};

export function make_search_field_value(
  persisted_: Signal<string>,
  get_search_query_: Accessor<string>
): SearchFieldValue {
  const [get_persisted, set_persisted] = persisted_;
  const [get_submitting, set_submitting] = createSignal<string>();
  const get_value = createMemo(() => get_submitting() ?? get_persisted());
  const set_value = ((value: string | ((previous: string) => string)) => {
    const new_value = typeof value === "function" ? value(untrack(get_value)) : value;
    if (untrack(get_submitting) === undefined) {
      set_persisted(new_value);
    } else {
      set_submitting(new_value);
    }
    return new_value;
  }) as Setter<string>;
  let current_submit: { query_: string; landed_: boolean } | undefined;

  const end_submit = (landed: boolean) => {
    current_submit!.landed_ = landed;
    current_submit = undefined;
    batch(() => {
      const submitting = untrack(get_submitting);
      set_submitting(undefined);
      if (landed && submitting !== undefined) set_persisted(submitting);
    });
  };
  const abort_on_popstate = (what_happened?: "replaceState" | "pushState" | "popstate") => {
    if (what_happened === "popstate" && current_submit) end_submit(false);
  };
  instant_exec_on_suspect_history_change.add(abort_on_popstate);
  onCleanup(() => instant_exec_on_suspect_history_change.delete(abort_on_popstate));
  createEffect(
    on(
      get_search_query_,
      query => {
        const token = current_submit;
        if (!token || query !== token.query_) return;
        queueMicrotask(() => {
          if (current_submit === token) end_submit(true);
        });
      },
      { defer: true }
    )
  );

  const begin_submit_ = (submitted_query: string, query_of_current_history_entry: string) => {
    const token = (current_submit = { query_: submitted_query, landed_: false });
    batch(() => {
      set_submitting(submitted_query);
      set_persisted(query_of_current_history_entry);
    });
    return () => {
      if (current_submit === token) end_submit(true);
      return token.landed_;
    };
  };

  const settle_ = (query: string) => {
    if (current_submit) return;
    batch(() => {
      set_submitting(undefined);
      set_persisted(query);
    });
  };

  return { value_: [get_value, set_value], begin_submit_, settle_ };
}
