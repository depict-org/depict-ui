import { createEffect, createSignal, on, Signal, untrack } from "solid-js";

/**
 * The search field value a modal shows and its submit function. With dont_sync_search_field_value_except_on_submit_ the modal starts empty and is de-coupled from the other search fields, except while a submit from it is in flight
 */
export function modal_search_field_value({
  props_search_field_value_,
  props_submit_query_,
  dont_sync_search_field_value_except_on_submit_,
  set_focus_target_after_close_,
  get_search_page_input_element_,
}: {
  props_search_field_value_: Signal<string>;
  props_submit_query_: (new_query?: string, before_navigate_?: VoidFunction) => Promise<boolean>;
  dont_sync_search_field_value_except_on_submit_: boolean;
  set_focus_target_after_close_: (get_target: (() => HTMLElement | undefined) | undefined) => void;
  get_search_page_input_element_: () => HTMLInputElement | undefined;
}) {
  const search_field_value_ = dont_sync_search_field_value_except_on_submit_
    ? createSignal("")
    : props_search_field_value_;
  let submits_in_flight = 0;
  const submit_query_ = async (new_query = untrack(search_field_value_[0])) => {
    submits_in_flight++;
    try {
      return await props_submit_query_(new_query, () => set_focus_target_after_close_(get_search_page_input_element_));
    } finally {
      submits_in_flight--;
    }
  };
  if (dont_sync_search_field_value_except_on_submit_) {
    createEffect(
      on(search_field_value_[0], value => submits_in_flight > 0 && props_search_field_value_[1](value), {
        defer: true,
      })
    );
  }
  return { search_field_value_, submit_query_ };
}
