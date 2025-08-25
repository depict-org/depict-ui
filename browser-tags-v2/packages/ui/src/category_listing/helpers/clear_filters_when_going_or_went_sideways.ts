import { ProductListingResponseV3 } from "@depict-ai/types/api/ProductListingResponseV3";
import { Accessor, createEffect, createReaction, on, onCleanup, Resource, Signal, untrack } from "solid-js";
import { solid_category_i18n, solid_plp_shared_i18n } from "../../locales/i18n_types";
import { catchify, dlog, queueMacroTask } from "@depict-ai/utilishared";
import { revertably_clear_filters } from "../../shared/helper_functions/revertably_clear_filters";
import { SearchFilter } from "@depict-ai/types/api/ProductListingRequestV2";
import { FilterWithData } from "../../shared/types";
import { ProductListing } from "@depict-ai/types/api/GetListingResponse";
import * as IdTypes from "../IdTypes";

/**
 * Clears filters when going to a new category that's besides the currently selected one.
 */
export function clear_filters_when_going_or_went_sideways({
  crumb_data_,
  id_to_query_for_,
  i18n_,
  selected_filters_,
  local_filter_cache_,
  expanded_hierarchical_filters_,
  plp_results_,
  sideways_filter_clearing_flag_,
  id_type_,
  expanded_filters_,
  filters_open_,
}: {
  crumb_data_: Accessor<ProductListing[] | undefined>;
  id_to_query_for_: Accessor<string>;
  i18n_: solid_category_i18n;
  local_filter_cache_: Signal<SearchFilter[]>;
  selected_filters_: Signal<FilterWithData[]>;
  expanded_hierarchical_filters_: Signal<{ value_: string[]; expanded_: boolean }[]>;
  plp_results_: Resource<(ProductListingResponseV3 & { failed?: true | undefined }) | undefined>;
  sideways_filter_clearing_flag_: Signal<boolean>;
  id_type_: Accessor<IdTypes.IdType>;
  expanded_filters_?: Signal<{ section_: string; expanded_: boolean }[]>;
  filters_open_?: Signal<boolean>;
}) {
  // If we just got opened in a new tab, clear filters instantly and remove the flag
  clear_if_opened_new_tab_with_sideways_url_params_flag({
    plp_results_,
    local_filter_cache_,
    expanded_hierarchical_filters_,
    selected_filters_,
    i18n_,
    sideways_filter_clearing_flag_,
    expanded_filters_,
    filters_open_,
  });

  // The code below is for when we're already open and the user navigates to a new category

  let previous_crumb_data = untrack(crumb_data_);
  let id_when_we_got_previous_data = { id_: untrack(id_to_query_for_), type_: untrack(id_type_) };
  let allow_filter_clearing = true; // set to false when going backwards/forwards

  // temporarily disable filter clearing when going backwards/forwards
  const handler = () => (allow_filter_clearing = false);
  window.addEventListener("popstate", handler); // popstate only gets called when using back/forwards button of browser or the history navigate to achieve the same, but not on pushState or replaceState
  onCleanup(() => window.removeEventListener("popstate", handler));

  createEffect(
    on(
      crumb_data_,
      catchify(new_crumb_data => {
        const id_of_new_data = id_to_query_for_();
        const type_of_id_of_new_data = id_type_();
        if (
          allow_filter_clearing &&
          previous_crumb_data &&
          new_crumb_data &&
          (id_of_new_data !== id_when_we_got_previous_data.id_ ||
            type_of_id_of_new_data !== id_when_we_got_previous_data.type_)
        ) {
          const previous_length = previous_crumb_data.length;
          const new_length = new_crumb_data.length;
          const went_upwards = new_length < previous_length;
          const went_downwards = previous_length < new_length;
          const shorter_array = went_upwards ? new_crumb_data : previous_crumb_data;
          const longer_array = went_upwards ? previous_crumb_data : new_crumb_data;

          if (
            !(
              (went_upwards || went_downwards) &&
              shorter_array.every(({ listing_id }, index) => longer_array[index].listing_id === listing_id)
            )
          ) {
            // We went sideways, not up or down. Clear filters.
            revertably_clear_filters({
              user_triggered_: false,
              i18n_,
              also_clear_sorting_: false,
              selected_filters_,
              expanded_hierarchical_filters_,
              local_filter_cache_,
              expanded_filters_,
              filters_open_,
            });
            // Also ensure we don't have `sideways_url_params_flag` set anymore
            sideways_filter_clearing_flag_[1](false);
          }
        }

        id_when_we_got_previous_data = { id_: id_of_new_data, type_: type_of_id_of_new_data };
        previous_crumb_data = new_crumb_data;
        if (!allow_filter_clearing) {
          allow_filter_clearing = true;
        }
      })
    )
  );
}

function clear_if_opened_new_tab_with_sideways_url_params_flag({
  plp_results_,
  expanded_hierarchical_filters_,
  i18n_,
  selected_filters_,
  local_filter_cache_,
  sideways_filter_clearing_flag_: [get_sideways_filter_clearing_flag_, set_sideways_filter_clearing_flag_],
  expanded_filters_,
  filters_open_,
}: {
  plp_results_: Resource<(ProductListingResponseV3 & { failed?: true | undefined }) | undefined>;
  expanded_hierarchical_filters_: Signal<{ value_: string[]; expanded_: boolean }[]>;
  i18n_: solid_plp_shared_i18n;
  selected_filters_: Signal<FilterWithData[]>;
  local_filter_cache_: Signal<SearchFilter[]>;
  sideways_filter_clearing_flag_: Signal<boolean>;
  expanded_filters_?: Signal<{ section_: string; expanded_: boolean }[]>;
  filters_open_?: Signal<boolean>;
}) {
  const tracking_function_for_plp_results = createReaction(() => {
    // On first rendering of the CategoryPage (after we have results), check if we got to this URL by going sideways in QuickLinks and clear filters with toast if so
    if (!untrack(get_sideways_filter_clearing_flag_)) return;

    set_sideways_filter_clearing_flag_(false);

    dlog("Flag to clear filters was set, clearing filters");
    queueMacroTask(() => {
      // Do it next task so that all the filters have time to populate
      revertably_clear_filters({
        user_triggered_: false,
        i18n_,
        also_clear_sorting_: false,
        selected_filters_,
        expanded_hierarchical_filters_,
        local_filter_cache_,
        filters_open_,
        expanded_filters_,
      });
    });
  });

  tracking_function_for_plp_results(plp_results_);
}
