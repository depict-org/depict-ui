import { Elem } from "@depict-ai/utilishared";
import { Accessor } from "solid-js";

/**
 * PLP internationalisation shared between search and category listing
 */
export type plp_shared_i18n = {
  backend_locale_: string;
  scroll_to_top_: string;
  back_: string;
  open_sorting_: string;
  close_sorting_: string;
  open_filters_: string;
  close_filters_: string;
  close_: string;
  ok_: string;
  filters_cleared_: string;
  we_cleared_your_filters_: string;
  restore_: string;
  sorting_text_: string;
  filter_text_: string;
  selected_filters_title_: string;
  filters_: string;
  view_less_: string;
  view_more_: string;
  /**
   * Also used for "clear all" in previous searches (TextSuggestions)
   */
  clear_all_from_filter_crumbs_: string;
  clear_individual_filter_: string;
  of_: string;
  clear_all_filters_from_big_button_: string;
  try_without_filters_: string;
  range_filter_low_point_aria_label_: string;
  range_filter_high_point_aria_label_: string;
  morphing_sign_expanded_aria_label_: string;
  morphing_sign_collapsed_aria_label_: string;
  search_a_filter_: (filter_section: string) => string;
  breadcrumbs_aria_label_: string;
  breadcrumbs_separator_: string;
  price_formatting_: {
    pre_: string;
    post_: string;
    decimal_places_delimiter_: string;
    thousands_delimiter_: string;
    places_after_comma_: number | "auto";
  };
};

/**
 * Search internationalisation
 */
export interface search_i18n extends plp_shared_i18n {
  placeholder_text_: string;
  show_n_results_: (number_of_results: HTMLElement) => Elem[];
  no_results_text_: string;
  no_products_: string;
  search_recs_title_: string;
  clear_filters_query_sorting_after_submit_: string;
  modal_view_all_results_: (number_of_results: HTMLElement) => Elem[];
  modal_discover_more_: string;
  get_showing_results_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => Elem[];
  get_showing_pages_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => Elem[];
  previous_searches_text_: string;
  category_: string;
  brand_: string;
  suggestions_: string;
  search_submit_button_aria_label_: string;
  search_field_field_aria_label_: string;
  previous_searches_delete_entry_from_history_: string;
  listing_suggestions_: string;
  content_: string;
  previous_: string;
  popular_: string;
  products_: string;
  modal_view_all_no_results_: string;
}

/**
 * Category internationalisation
 */
export interface category_i18n extends plp_shared_i18n {
  show_n_products_: (number_of_results: HTMLElement) => Elem[];
  no_products_text_: string;
  product_: string;
  products_: string;
  quicklinks_aria_label_: string;
}

/**
 * Depict UI internationalisation
 */
export interface Locale extends category_i18n, search_i18n {}

/**
 * For anything that is not exposed and only used internally we can use solid signals to get more performant rendering.
 * For anything that can be used outside of solid, like Product Cards and InstantCards these types should not be used.
 *
 * Any solid_ type below should not be exposed outside of this library, as the accessors can be confusing and unnecessary.
 */

/** For internal components using i18n that gets wrapped in solid's Accessors */
export type solid_plp_shared_i18n = { [K in keyof plp_shared_i18n]: Accessor<plp_shared_i18n[K]> };
/** For internal components using i18n that gets wrapped in solid's Accessors */
export type solid_search_i18n = { [K in keyof search_i18n]: Accessor<search_i18n[K]> };
/** For internal components using i18n that gets wrapped in solid's Accessors */
export type solid_category_i18n = { [K in keyof category_i18n]: Accessor<category_i18n[K]> };
