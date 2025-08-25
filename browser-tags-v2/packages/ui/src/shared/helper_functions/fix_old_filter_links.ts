import { createComputed, Resource, Signal } from "solid-js";
import { FilterWithData } from "../types";
import { ProductListingResponseAfterDisplayTransformer } from "../../category_listing/types";
import { SearchResponseAfterDisplayTransformer } from "../../search/types";

/**
 * We changed the field name of the filters from the actual field to group_title to make the urls more beautiful with localised group titles.
 * This function and code in modify_fiters_to_group_title_as_field.ts and url_state/encoding.ts fixes the old filter links so we don't break them.
 */
export function fix_old_filter_links(
  plp_results_: Resource<
    ProductListingResponseAfterDisplayTransformer | SearchResponseAfterDisplayTransformer | undefined
  >,
  [get_selected_filters, set_selected_filters]: Signal<FilterWithData[]>
) {
  createComputed(() => {
    const available_filters = plp_results_()?.filters;
    if (!available_filters) return;
    const selected_filters = get_selected_filters();
    if (!selected_filters) return;
    const new_filters: FilterWithData[] = [];
    let modified_filters = false;
    for (let i = 0; i < selected_filters.length; i++) {
      const selected_filter = selected_filters[i];
      const available_filter = available_filters.find(
        available_filter =>
          available_filter.field === selected_filter.field && available_filter.op === selected_filter.op
      );
      const available_filter_old_filter_link = available_filters.find(
        available_filter =>
          available_filter.actual_field === selected_filter.field && available_filter.op === selected_filter.op
      );
      if (!available_filter && available_filter_old_filter_link) {
        new_filters.push({ ...selected_filter, field: available_filter_old_filter_link.field }); // <- Change the field to be the new field which actually is group_title
        modified_filters = true;
      } else {
        new_filters.push(selected_filter);
      }
    }
    if (modified_filters) {
      // This will unfortunately trigger a refetch which isn't great UX but it's the best we can do for now
      set_selected_filters(new_filters);
    }
  });
}
