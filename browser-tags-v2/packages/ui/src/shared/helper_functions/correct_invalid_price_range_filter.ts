import { Accessor, createComputed, Signal, untrack } from "solid-js";
import { RangeFilterMeta, SearchFilter } from "@depict-ai/types/api/BaseSearchRequestV3";
import { FilterWithData } from "../types";

const get_available_range = (available_filters_: Accessor<SearchFilter[] | undefined>, search_for_field: string) => {
  const maybe_meta = untrack(available_filters_)?.find(
    ({ op, field }) => field === search_for_field && op === "inrange"
  )?.meta as RangeFilterMeta | undefined;
  if (maybe_meta?.min != undefined && maybe_meta?.max != undefined) {
    return [maybe_meta.min, maybe_meta.max] as const;
  }
};

/**
 * Very specific function used in CategoryPage and SearchPage. What it does is making sure that the RangeFilter for sale_price_per_unit is within bounds when filters are preserved between search queries. It might make sense to allow more range filters and not only sale_price_per_unit in the future, but right now there are none
 */
export function correct_invalid_price_range_filter({
  available_filters_,
  selected_filters_,
}: {
  available_filters_: Accessor<SearchFilter[] | undefined>;
  selected_filters_: Signal<FilterWithData[]>;
}) {
  createComputed(() => {
    // we don't want to update (as selected_filters change) as navigating will change the selected range before the available range changes and we might ruin a perfectly valid filter range
    available_filters_();
    correct_range_filter_range_once({ selected_filters_, available_filters_ });
  });
}

function correct_range_filter_range_once({
  selected_filters_: [read_selected_filters_, write_selected_filters_],
  available_filters_,
}: {
  available_filters_: Accessor<SearchFilter[] | undefined>;
  selected_filters_: Signal<FilterWithData[]>;
}) {
  const selected_filters = untrack(read_selected_filters_);
  if (!selected_filters) {
    return;
  }
  for (let i = 0; i < selected_filters.length; i++) {
    const range_filter = selected_filters[i];
    if (range_filter.op !== "inrange") {
      // not a range filter
      continue;
    }
    const selected = range_filter?.data as [number, number];
    if (!Array.isArray(selected) || selected.length !== 2) {
      // backend is doing weird stuff again
      continue;
    }
    const available = get_available_range(available_filters_, range_filter.field);
    if (!available) {
      return;
    }
    const [min, max] = available;
    let [lower, upper] = selected;
    let modified = false;
    if (lower < min || lower > max) {
      lower = min;
      modified = true;
    }
    if (upper > max || upper < min) {
      upper = max;
      modified = true;
    }
    if (modified) {
      const new_filters = [...selected_filters];
      const new_filter = { ...range_filter, data: [lower, upper] };
      new_filters.splice(i, 1, ...(lower === min && upper === max ? [] : [new_filter]));
      write_selected_filters_(new_filters);
    }
  }
}
