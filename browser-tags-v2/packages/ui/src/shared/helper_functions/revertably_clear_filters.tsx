/** @jsxImportSource solid-js */
// noinspection BadExpressionStatementJS

import { createEffect, createRoot, on, Signal, untrack } from "solid-js";
import { solid_plp_shared_i18n } from "../../locales/i18n_types";
import { SearchFilter, SortModel } from "@depict-ai/types/api/SearchRequestV3";
import { show_toast } from "./show_toast";
import { catchify } from "@depict-ai/utilishared";
import { FilterWithData } from "../types";

export function revertably_clear_filters(
  props: {
    user_triggered_: boolean;
    i18n_: solid_plp_shared_i18n;
    local_filter_cache_: Signal<SearchFilter[]>;
    selected_filters_: Signal<FilterWithData[]>;
    delay_toast_?: boolean;
    expanded_hierarchical_filters_: Signal<{ value_: string[]; expanded_: boolean }[]>;
    /**
     * If passed, filter expanded state is also cleared and restored as filters are
     */
    expanded_filters_?: Signal<{ section_: string; expanded_: boolean }[]>;
    /**
     * Same as above, but for the filters being open
     */
    filters_open_?: Signal<boolean>;
  } & ({ also_clear_sorting_: true; current_sorting_: Signal<SortModel | undefined> } | { also_clear_sorting_: false })
) {
  let previous_sorting: SortModel | undefined;
  let on_toast_hidden: VoidFunction;
  let close_toast_ = () => {
    // if we get called to close the toast before it has shown, never show it
    show_configured_toast = () => {};
  };
  const {
    user_triggered_,
    i18n_,
    also_clear_sorting_,
    local_filter_cache_: [get_local_filter_cache, set_local_filter_cache],
    selected_filters_: [get_selected_filters, set_selected_filters],
    expanded_hierarchical_filters_: [get_expanded_hierarchical_filters, set_expanded_hierarchical_filters],
    delay_toast_,
    expanded_filters_,
    filters_open_,
  } = props;
  const previous_selected_filters = untrack(get_selected_filters);
  if (!previous_selected_filters.length) {
    // no filters selected, still clear sorting if applicable but don't display a toast for that since it's very minor
    if (also_clear_sorting_) {
      props.current_sorting_[1]();
    }
    if (delay_toast_) {
      return () => {};
    }
    return;
  }
  const previousExpandedFilters = untrack(() => expanded_filters_?.[0]());
  const previousFiltersOpen = untrack(() => filters_open_?.[0]());
  const previous_expanded_hierarchical_filters = untrack(get_expanded_hierarchical_filters);
  const previous_local_filter_cache = untrack(get_local_filter_cache);
  const statement_accessor = user_triggered_ ? i18n_.filters_cleared_ : i18n_.we_cleared_your_filters_;

  expanded_filters_?.[1]([]);
  filters_open_?.[1](false);
  set_selected_filters([]);
  scrollTo({ top: 0 });
  // also collapse expanded filters in hierarchical filter tree again
  set_expanded_hierarchical_filters([]);

  if (also_clear_sorting_) {
    previous_sorting = props.current_sorting_[0]();
    props.current_sorting_[1]();
  }

  // lifetime of this component isn't the same as lifetime of toast
  createRoot(dispose => {
    on_toast_hidden = dispose;
    createEffect(
      on(
        get_selected_filters,
        () => {
          // if selected filters change, hide the toast
          close_toast_();
        },
        { defer: true }
      )
    );
  });

  let show_configured_toast = () => {
    ({ close_toast_ } = show_toast({
      class: "cleared_filters",
      close_after_: 10_000,
      on_close_: on_toast_hidden,
      children: [
        <div class="statement">{statement_accessor()}</div>,
        <div class="buttons">
          <button
            class="restore minor"
            onClick={catchify(() => {
              set_selected_filters(previous_selected_filters);
              set_expanded_hierarchical_filters(previous_expanded_hierarchical_filters);
              if (previousExpandedFilters) {
                expanded_filters_?.[1](previousExpandedFilters);
              }
              if (also_clear_sorting_ && previous_sorting) {
                props.current_sorting_[1](previous_sorting);
              }
              if (typeof previousFiltersOpen === "boolean") {
                filters_open_?.[1](previousFiltersOpen);
              }
              // also restore previous filter cache, I think this should trigger a correct re-merging with newly in-came filters from backend in case there are any. This is because selected filters otherwise might not exist anymore and therefore can't be viewed in the UI
              set_local_filter_cache(previous_local_filter_cache);
              scrollTo({ top: 0 });
            })}
          >
            {i18n_.restore_()}
          </button>
          <button
            onClick={
              () => close_toast_() /* We have to wait for close_toast_ to get re-defined after the call to show_toast */
            }
            class="ok major"
          >
            {i18n_.ok_()}
          </button>
        </div>,
      ],
    }));
  };

  if (delay_toast_) {
    return show_configured_toast;
  } else {
    show_configured_toast();
  }
}
