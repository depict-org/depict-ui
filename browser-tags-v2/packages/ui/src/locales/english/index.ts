import { category_i18n, search_i18n } from "../i18n_types";

const english_base_translation = {
  backend_locale_: "", // Set to empty string to pass type validation here. We add these where we export the locales in index.ts since the language parts are very much the same right now.
  "of_": "of",
  "sorting_text_": "Sort",
  "filter_text_": "Filter",
  "filters_": "Filters",
  "clear_all_from_filter_crumbs_": "Clear all",
  "clear_all_filters_from_big_button_": "Clear all filters",
  "view_more_": "View more",
  "view_less_": "View less",
  "selected_filters_title_": "Filters",
  "try_without_filters_": "Try again without filters",
  "clear_individual_filter_": "Clear",
  range_filter_low_point_aria_label_: "Range filter lower value",
  range_filter_high_point_aria_label_: "Range filter higher value",
  morphing_sign_expanded_aria_label_: "Collapse section",
  morphing_sign_collapsed_aria_label_: "Expand section",
  close_: "Close",
  ok_: "OK",
  filters_cleared_: "Filters cleared",
  we_cleared_your_filters_: "We cleared your filters",
  restore_: "Restore",
  open_sorting_: "Open sorting",
  close_sorting_: "Close sorting",
  open_filters_: "Open filters",
  close_filters_: "Close filters",
  back_: "Back",
  scroll_to_top_: "Scroll to top",
  search_a_filter_: (section: string) => `Search ${section.toLowerCase()}`,
  breadcrumbs_aria_label_: "Breadcrumbs",
  breadcrumbs_separator_: "/",
  /** Fallback price formatting */
  price_formatting_: {
    pre_: "",
    post_: "",
    decimal_places_delimiter_: ".",
    thousands_delimiter_: ",",
    places_after_comma_: 2,
  },
} as const;

export const english_category_translation: category_i18n = {
  ...english_base_translation,
  show_n_products_: (number_of_results: HTMLElement) => ["Show ", number_of_results, " products"],
  no_products_text_: "No products here, sorry",
  product_: "product",
  products_: "products",
  quicklinks_aria_label_: "Categories",
} as const;

export const english_search_translation: search_i18n = {
  ...english_base_translation,
  show_n_results_: (number_of_results: HTMLElement) => ["Show ", number_of_results, " result(s)"],
  modal_view_all_results_: (number_of_results: HTMLElement) => ["View all ", number_of_results, " result(s)"],
  "search_recs_title_": "Other alternatives",
  "category_": "Category",
  "brand_": "Brand",
  "modal_discover_more_": "Discover more",
  "previous_searches_text_": "Your previous searches",
  "suggestions_": "Suggestions",
  "no_results_text_": "No results",
  "clear_filters_query_sorting_after_submit_": "Clear query. Also clear sorting and filters after next submit.",
  "placeholder_text_": "Search",
  "no_products_": "No products found",
  "content_": "Content",
  search_submit_button_aria_label_: "Search",
  search_field_field_aria_label_: "Search query field",
  previous_searches_delete_entry_from_history_: "Remove query from history",
  listing_suggestions_: "Categories & Collections",
  previous_: "Previous",
  popular_: "Popular",
  products_: "Products",
  get_showing_results_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const product_form = number_of_results === 1 ? "product" : "products";
    return has_query
      ? [`Showing `, number_of_results_element, ` ${product_form} for `, query]
      : [`Showing all `, number_of_results_element, ` ${product_form}`];
  },
  get_showing_pages_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const page_form = number_of_results === 1 ? "page" : "pages";
    return has_query
      ? [`Found `, number_of_results_element, ` ${page_form} for `, query]
      : [`Found `, number_of_results_element, ` ${page_form}`];
  },
  modal_view_all_no_results_: "View alternatives",
} as const;
