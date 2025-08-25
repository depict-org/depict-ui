import { FilterBody } from "../components/SortAndFilter/FilterBody";

/**
 * Returns true when we have an array of filters that's an array but empty and no selected filters.
 * Used for hiding the filter button, filter section is from sort/filter modal and desktop filters
 */
export function should_hide_filtering(args_for_filtering: Parameters<typeof FilterBody>[0]) {
  return args_for_filtering.available_filters_()?.length === 0 && !args_for_filtering.selected_filters_[0]()?.length;
}
