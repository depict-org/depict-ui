/** @jsxImportSource solid-js */
import {
  HierarchicalValuesFilterMeta,
  SearchFilter,
  ValuesFilterMeta,
} from "@depict-ai/types/api/ProductListingResponseV3";
import { Accessor, createMemo, createSignal, Show } from "solid-js";
import { CrossIcon } from "../../icons/CrossIcon";
import { dwarn } from "@depict-ai/utilishared";
import { solid_plp_shared_i18n } from "../../../../locales/i18n_types";
import { SearchIcon } from "../../icons/SearchIcon";

const min_items_to_enable_filter_searching = 15; // For checkbox color and checkbox grid we 2x this

/**
 * Enables searching filter groups for a specific filter name
 */
export function use_search_in_filter(
  filter_array_: Accessor<SearchFilter[]>,
  section: string,
  i18n_: solid_plp_shared_i18n
) {
  const [filter_query_, set_filter_query_] = createSignal<string | undefined>();
  // Check if we have enough items to enable searching
  const enable_searchability = createMemo(() => {
    let count = 0;
    for (const filter of filter_array_()) {
      const type = filter.meta?.type;
      if (type === "range") continue;
      const length = (filter.meta as ValuesFilterMeta | HierarchicalValuesFilterMeta).values.length;
      count += type === "checkbox-color" || type === "checkbox-grid" ? length / 2 : length; // For checkbox-color we have two columns, checkbox-grid three, so we can show search later
    }
    return count >= min_items_to_enable_filter_searching;
  });

  const SearchThisFilterGroup_ = () => {
    return (
      <Show when={enable_searchability()}>
        <div class="search-in-filters">
          <input
            type="text"
            class="query"
            value={filter_query_() || ""}
            onInput={ev => set_filter_query_(ev.currentTarget.value)}
            placeholder={i18n_.search_a_filter_()(section)}
          />
          <SearchIcon width="16" height="17.6" class="search-icon" />
          <button
            style={{ display: filter_query_() ? "" : "none" }}
            class="clear-filter-search"
            onClick={() => set_filter_query_()}
          >
            <CrossIcon width="12" height="12" />
          </button>
        </div>
      </Show>
    );
  };

  const searched_filter_array_ = createMemo(() => {
    const query = filter_query_();
    if (!enable_searchability() || !query) return filter_array_();
    const lowercase_query = query.toLowerCase();
    const check_string_match = (to_check: string) => {
      to_check = to_check.toLowerCase();
      return to_check.includes(lowercase_query) || lowercase_query.includes(to_check);
    };

    return filter_array_()
      .map(filter => {
        const type = filter.meta?.type;
        if (type === "range") return filter; // can't search in range filters and for checkbox-hierarchical we do the searching in the filter component since we have access to a hierarchical structure there
        const meta = filter.meta as ValuesFilterMeta | HierarchicalValuesFilterMeta;
        const { values, names, counts } = meta;
        if (!Array.isArray(values)) return filter; // Might have to adjust this in the future, but I think these super simple filters won't need search
        const is_hierarchical_checkbox = type === "checkbox-hierarchical";
        // Which index of counts, values and names should be kept
        const filtered_indexes = values.map((item: (typeof values)[number], index: number) => {
          const item_from_names = names?.[index];
          if (item_from_names && !is_hierarchical_checkbox) {
            // We should use names if they exist, but sometimes backend doesn't provide any at all, and sometimes they are undefined, presumably from create_modified_filters
            item = item_from_names;
          }
          if (typeof item === "number") return true;
          if (is_hierarchical_checkbox && names) {
            // Special case for hierarchical checkboxes where we need to check if any of the names in the path match the query
            item = (item as string[]).map(
              (_, index) =>
                names[
                  find_str_arr_in_str_arr_arr("findIndex", values as string[][], (item as string[]).slice(0, index + 1))
                ]
            );
          }
          if (Array.isArray(item)) {
            return item.some(item => check_string_match(item + "")); // If any of the items in the array match, keep it
          }
          return check_string_match(item);
        });
        const new_values = (values as any[]).filter((_, i) => filtered_indexes[i]);
        if (!new_values.length) return false; // false = please delete this filter, see below

        const new_filter_object = {
          ...filter,
          meta: {
            ...meta,
            ...(counts ? { counts: counts?.filter((_, i) => filtered_indexes[i]) } : {}),
            ...(names ? { names: meta.names?.filter((_, i) => filtered_indexes[i]) } : {}),
            values: new_values,
          },
        };

        if (is_hierarchical_checkbox) {
          // For hierarchical checkbox we need to fill the holes created by filtering, for example if there is
          // ["Clothes"]
          // ["Clothes", "Blazers"]
          // And the user searched for "blazers" we need to add back ["Clothes"] so CheckboxHierarchicalFilter doesn't get confused
          // I explored doing the filtering there instead, but it's very hard to do it early enough before the expansion/collapsedness is calculated and check-logic is set up in relation to other items
          // So we do it here instead
          const new_meta = new_filter_object.meta;
          const new_values = new_meta.values as string[][];
          for (const value of new_values) {
            if (!Array.isArray(value)) continue; // Shouldn't happen
            if (value.length < 2) continue; // No parent
            const parent = value.slice(0, -1);
            // Check if parent exists
            if (find_str_arr_in_str_arr_arr("some", new_values, parent)) {
              continue; // Parent exists
            }
            // Otherwise, put it back
            const index_to_restore = find_str_arr_in_str_arr_arr("findIndex", values as string[][], parent);
            if (index_to_restore < 0) {
              dwarn("Can't restore", parent, "to", new_values);
              continue;
            }
            const current_index_of_us = new_values.findIndex(item => item === value);
            new_values.splice(current_index_of_us, 0, values[index_to_restore] as string[]);
            const count_to_restore = counts?.[index_to_restore];
            if (count_to_restore) {
              new_meta.counts?.splice(current_index_of_us, 0, count_to_restore);
            }
            const name_to_restore = names?.[index_to_restore];
            if (name_to_restore) {
              new_meta.names?.splice(current_index_of_us, 0, name_to_restore);
            }
          }
        }

        return new_filter_object;
      })
      .filter(filter => filter) as SearchFilter[]; // Delete filters that don't have a value anymore
  });

  return {
    SearchThisFilterGroup_,
    searched_filter_array_,
    filter_query_,
  };
}

/**
 * Finds/whatevers what's effectively one hierarchical filter item in an array of hierarchical filter items
 * Functions similar to this happen loads in create_modified_filters, but they have additional checks so not touching them RN
 */
function find_str_arr_in_str_arr_arr<Operation extends "findIndex" | "find" | "some">(
  operation: Operation,
  haystack: string[][],
  needle: string[]
) {
  return haystack[operation](
    (value: (typeof haystack)[number]) =>
      value.length === needle.length && value.every((item, index) => item === needle[index])
  ) as Operation extends "some" ? boolean : Operation extends "findIndex" ? number : string[] | undefined;
}
