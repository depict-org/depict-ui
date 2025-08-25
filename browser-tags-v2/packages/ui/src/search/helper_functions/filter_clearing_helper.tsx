import { Accessor, createComputed, createSignal, on, Signal, untrack } from "solid-js";
import { SearchFilter, SortModel } from "@depict-ai/types/api/SearchRequestV3";
import { catchify } from "@depict-ai/utilishared";
import { revertably_clear_filters } from "../../shared/helper_functions/revertably_clear_filters";
import { solid_plp_shared_i18n } from "../../locales/i18n_types";
import { FilterWithData } from "../../shared/types";

/**
 * Helper function used by Search to clear filters on next submit if the clear button was pressed or the query deleted or replaced
 */
export function filter_clearing_helper_factory({
  selected_filters_,
  get_search_query_,
  current_sorting_,
  expanded_hierarchical_filters_,
  i18n_,
  local_filter_cache_,
  expanded_filters_,
  filters_open_,
}: {
  selected_filters_: Signal<FilterWithData[]>;
  get_search_query_: Accessor<string>;
  current_sorting_: Signal<SortModel | undefined>;
  expanded_hierarchical_filters_: Signal<{ value_: string[]; expanded_: boolean }[]>;
  i18n_: solid_plp_shared_i18n;
  local_filter_cache_: Signal<SearchFilter[]>;
  expanded_filters_: Signal<{ section_: string; expanded_: boolean }[]>;
  filters_open_: Signal<boolean>;
}) {
  const [get_selected_filters] = selected_filters_;
  // Possible values:
  // 0 - we should not clear next submit
  // 1 - we should clear next submit due to internal heuristics
  // 2 - we should clear next submit due to EXPLICIT user action (i.e. clear button pressed)
  const clear_filters_next_submit_ = createSignal(0); // we store this here (and not in history.state) (maybe there's a better place) because it's a very temporary thing. I.e. as soon as anything breaks the "flow of intent" to make a new search we want this reset
  const [get_clear_filters_next_submit, set_clear_filters_next_submit] = clear_filters_next_submit_;
  const clear_filters = (user_triggered: boolean) => set_clear_filters_next_submit(user_triggered ? 2 : 1);

  createComputed(
    on(
      get_selected_filters,
      () => {
        // if the selected filters update, clear the clearing signal
        set_clear_filters_next_submit(0);
      },
      { defer: true }
    )
  );

  createComputed(
    on(
      get_search_query_,
      catchify(() => {
        // when a query was submitted, clear filters if clear was pressed before
        const clear_value = untrack(get_clear_filters_next_submit);
        if (clear_value) {
          set_clear_filters_next_submit(0);
          revertably_clear_filters({
            user_triggered_: clear_value === 2,
            selected_filters_,
            i18n_,
            also_clear_sorting_: true,
            current_sorting_,
            expanded_hierarchical_filters_,
            local_filter_cache_,
            expanded_filters_,
            filters_open_,
          });
        }
      }),
      { defer: true }
    )
  );

  return clear_filters;
}
