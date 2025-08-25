import { SearchFilter } from "@depict-ai/types/api/SearchResponse";
import { Locale } from "@depict-ai/react-ui/locales/latest";
import { createMemo, createSignal } from "solid-js";
import { wrap_solid_in_react } from "../utils/wrap_solid_in_react";
import { get_set_function_to_signal } from "../utils/get_set_function_to_signal";
import {
  accessor_of_object_to_object_with_accessor_values,
  create_modified_filters,
  SelectedFilters,
} from "@depict-ai/ui/latest";
import { unwrap_reactive } from "../utils/unwrap_reactive";

export function ReactSelectedFilters(react_props: {
  availableFilters: SearchFilter[] | undefined;
  hidden?: boolean;
  selectedFilters: { field: string; op: SearchFilter["op"]; data: any }[];
  setSelectedFilters: (new_value: { field: string; op: SearchFilter["op"]; data: any }[]) => void;
  i18n: Locale;
  expandedHierarchicalFilters: { value_: string[]; expanded_: boolean }[];
  setExpandedHierarchicalFilters: (new_value: { value_: string[]; expanded_: boolean }[]) => void;
}) {
  return wrap_solid_in_react({
    solid_component: props_store => {
      const [get_search_sorting_open_] = createSignal(false);
      const local_filter_cache_ = createSignal<SearchFilter[]>([]);
      const number_of_rendered_selected_filters_items_ = createSignal(0);
      const i18n_ = accessor_of_object_to_object_with_accessor_values(() => props_store.i18n);
      const selected_filters_ = get_set_function_to_signal(
        createMemo(() => unwrap_reactive(props_store.selectedFilters) as (typeof props_store)["selectedFilters"]),
        () => props_store.setSelectedFilters
      );
      const available_filters_ = () => props_store.availableFilters;

      create_modified_filters({
        available_filters_,
        selected_filters_,
        local_filter_cache_,
      });

      return SelectedFilters({
        get_search_sorting_open_,
        get_search_filters_open_: () => props_store.hidden ?? false,
        expanded_hierarchical_filters_: get_set_function_to_signal(
          () => props_store.expandedHierarchicalFilters,
          () => props_store.setExpandedHierarchicalFilters
        ),
        number_of_rendered_selected_filters_items_,
        i18n_,
        selected_filters_,
        local_filter_cache_,
      });
    },
    props: react_props,
    className: "depict plp",
  });
}
