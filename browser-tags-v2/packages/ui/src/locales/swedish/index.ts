import { english_category_translation, english_search_translation } from "../english";
import { category_i18n, search_i18n } from "../i18n_types";

const swedish_base_translation = {
  "of_": "av", // 50 of 120
  "sorting_text_": "Sortera",
  "filter_text_": "Filtrera",
  "filters_": "Filtrera",
  "clear_all_from_filter_crumbs_": "Rensa alla",
  "clear_all_filters_from_big_button_": "Rensa alla filter",
  "view_more_": "Visa fler",
  "view_less_": "Visa färre",
  "selected_filters_title_": "Filter",
  "try_without_filters_": "Prova igen utan filter",
  "clear_individual_filter_": "Rensa",
  range_filter_low_point_aria_label_: "Intervallfilter från värde",
  range_filter_high_point_aria_label_: "Intervallfilter till värde",
  morphing_sign_expanded_aria_label_: "Fäll ihop sektion",
  morphing_sign_collapsed_aria_label_: "Expandera sektion",
  close_: "Stäng",
  ok_: "OK",
  filters_cleared_: "Filter rensade",
  we_cleared_your_filters_: "Vi rensade dina filter",
  restore_: "Återställ",
  open_sorting_: "Öppna sortering",
  close_sorting_: "Stäng sortering",
  open_filters_: "Öppna filter",
  close_filters_: "Stäng filter",
  back_: "Tillbaka",
  scroll_to_top_: "Scrolla upp",
  breadcrumbs_aria_label_: "Länkkedja",
  search_a_filter_: (section: string) => `Sök ${section.toLowerCase()}`,
} as const;

export const swedish_category_translation: category_i18n = {
  ...english_category_translation, // fallbacks for untranslated strings
  ...swedish_base_translation,
  show_n_products_: (number_of_results: HTMLElement) => ["Visa ", number_of_results, " produkter"],
  no_products_text_: "Inga produkter här, tyvärr",
  product_: "produkt",
  products_: "produkter",
  quicklinks_aria_label_: "Kategorier",
};

export const swedish_search_translation: search_i18n = {
  ...english_search_translation, // fallbacks for untranslated strings
  ...swedish_base_translation,
  "no_results_text_": "Inga resultat",
  modal_view_all_results_: (number_of_results: HTMLElement) => ["Visa alla ", number_of_results, " resultat"],
  modal_view_all_no_results_: "Visa andra alternativ",
  "search_recs_title_": "Andra alternativ",
  "clear_filters_query_sorting_after_submit_": "Rensa förfråga och filter + sorting efter ny förfråga",
  "previous_searches_text_": "Dina tidigare sökningar",
  "category_": "Kategori",
  "brand_": "Varumärke",
  "suggestions_": "Förslag",
  "modal_discover_more_": "Utforska mer",
  "placeholder_text_": "Sök",
  "content_": "Innehåll",
  "no_products_": "Inga produkter hittades",
  search_submit_button_aria_label_: "Sök",
  search_field_field_aria_label_: "Sökfält",
  previous_searches_delete_entry_from_history_: "Rensa alla",
  listing_suggestions_: "Kategorier & Kollektioner",
  previous_: "Tidigare",
  popular_: "Populära",
  products_: "Produkter",
  get_showing_results_for_: (
    q: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const singular = number_of_results === 1;
    return has_query
      ? [`Visar `, number_of_results_element, ` produkt${singular ? "" : "er"} för `, q]
      : [`Visar samtliga `, number_of_results_element, ` produkt${singular ? "" : "er"}`];
  },
  get_showing_pages_for_: (
    q: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const singular = number_of_results === 1;
    return has_query
      ? [`Hittade `, number_of_results_element, ` sid${singular ? "a" : "or"} för `, q]
      : [`Hittade `, number_of_results_element, ` sid${singular ? "a" : "or"}`];
  },
  show_n_results_: (number_of_results: HTMLElement) => ["Visa ", number_of_results, " resultat"],
} as const;
