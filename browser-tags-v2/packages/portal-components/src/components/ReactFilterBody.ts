import { SearchFilter } from "@depict-ai/types/api/SearchResponse";
import { Locale } from "@depict-ai/react-ui/locales/latest";
import {
  accessor_of_object_to_object_with_accessor_values,
  create_modified_filters,
  FilterBody,
} from "@depict-ai/ui/latest";
import { wrap_solid_in_react } from "../utils/wrap_solid_in_react";
import { get_set_function_to_signal } from "../utils/get_set_function_to_signal";
import { createMemo, createSignal } from "solid-js";
import { insert } from "solid-js/web";
import { unwrap_reactive } from "../utils/unwrap_reactive";

export function ReactFilterBody(react_props: {
  availableFilters: SearchFilter[] | undefined;
  expandedFilters: { section_: string; expanded_: boolean }[];
  setExpandedFilters: (new_value: { section_: string; expanded_: boolean }[]) => void;
  selectedFilters: { field: string; op: SearchFilter["op"]; data: any }[];
  setSelectedFilters: (new_value: { field: string; op: SearchFilter["op"]; data: any }[]) => void;
  i18n: Locale;
  expandedHierarchicalFilters: { value_: string[]; expanded_: boolean }[];
  setExpandedHierarchicalFilters: (new_value: { value_: string[]; expanded_: boolean }[]) => void;
  hideClearAllButton?: boolean;
  hideCount0FilterOptions_?: boolean;
}) {
  return wrap_solid_in_react({
    solid_component: props_store => {
      const local_filter_cache_ = createSignal<SearchFilter[]>([]);
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

      const filter_body = FilterBody({
        get are_in_modal_() {
          return props_store.hideClearAllButton ?? false;
        },
        i18n_,
        available_filters_,
        expanded_filters_: get_set_function_to_signal(
          () => props_store.expandedFilters,
          () => props_store.setExpandedFilters
        ),
        selected_filters_,
        expanded_hierarchical_filters_: get_set_function_to_signal(
          () => props_store.expandedHierarchicalFilters,
          () => props_store.setExpandedHierarchicalFilters
        ),
        local_filter_cache_,
        hideCount0FilterOptions_: () => react_props.hideCount0FilterOptions_ ?? false,
      });

      const filters = document.createElement("div");
      filters.classList.add("filters");
      const body = document.createElement("div");
      body.classList.add("body");
      insert(body, filter_body);
      filters.append(body);
      return filters;
    },
    props: react_props,
    className: "depict plp",
  });
}
