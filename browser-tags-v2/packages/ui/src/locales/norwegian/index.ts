import { english_category_translation, english_search_translation } from "../english";
import { category_i18n, search_i18n } from "../i18n_types";

const norwegian_base_translation = {
  "of_": "av",
  "sorting_text_": "Sorter",
  "filter_text_": "Filter",
  "filters_": "Filtre",
  "clear_all_from_filter_crumbs_": "Fjern alt",
  "clear_all_filters_from_big_button_": "Fjern alle filtre",
  "view_more_": "Vis mer",
  "view_less_": "Vis mindre",
  "selected_filters_title_": "Filtere",
  "try_without_filters_": "Prøv igjen uten filtre",
  "clear_individual_filter_": "Fjern",
  range_filter_low_point_aria_label_: "Nedre verdi for områdefilter",
  range_filter_high_point_aria_label_: "Øvre verdi for områdefilter",
  morphing_sign_expanded_aria_label_: "Skjul del",
  morphing_sign_collapsed_aria_label_: "Utvid del",
  close_: "Lukk",
  ok_: "OK",
  filters_cleared_: "Filtrene er tømt",
  we_cleared_your_filters_: "Vi har tømt filtrene",
  restore_: "Gjenopprett",
  open_sorting_: "Åpne sortering",
  close_sorting_: "Lukk sortering",
  open_filters_: "Åpne filtre",
  close_filters_: "Lukk filtre",
  back_: "Tilbake",
  scroll_to_top_: "Rull til toppen",
  breadcrumbs_aria_label_: "Oversikt",
  search_a_filter_: (section: string) => `Søk ${section.toLowerCase()}`,
} as const;

export const norwegian_category_translation: category_i18n = {
  ...english_category_translation, // fallbacks for untranslated strings
  ...norwegian_base_translation,
  show_n_products_: (number_of_results: HTMLElement) => ["Vis ", number_of_results, " produkter"],
  no_products_text_: "Ingen produkter her, beklager",
  product_: "produkt",
  products_: "produkter",
  quicklinks_aria_label_: "Kategorier",
};

export const norwegian_search_translation: search_i18n = {
  ...english_search_translation, // fallbacks for untranslated strings
  ...norwegian_base_translation,
  show_n_results_: (number_of_results: HTMLElement) => ["Vis ", number_of_results, " resultat(er)"],
  "clear_filters_query_sorting_after_submit_": "Tøm søkefeltet. Tøm også sortering og filtrene etter neste innsending.",
  modal_view_all_results_: (number_of_results: HTMLElement) => ["Vis alle ", number_of_results, " resultater"],
  "no_products_": "Ingen produkter funnet",
  "search_recs_title_": "Andre alternativer",
  "modal_discover_more_": "Oppdag mer",
  "category_": "Kategori",
  "brand_": "Merke",
  "suggestions_": "Forslag",
  "previous_searches_text_": "Tidligere søk",
  "content_": "Innhold",
  "no_results_text_": "Ingen resultater",
  "placeholder_text_": "Søk",
  search_submit_button_aria_label_: "Søk",
  "previous_searches_delete_entry_from_history_": "Slett spørsmål fra loggen",
  "search_field_field_aria_label_": "Søk spørsmålfelt",
  listing_suggestions_: "Kategorier & Kolleksjoner",
  previous_: "Forrige",
  popular_: "Populær",
  products_: "Produkter",
  get_showing_results_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const product_form = number_of_results === 1 ? "produkt" : "produkter";
    return has_query
      ? [`Viser `, number_of_results_element, ` ${product_form} for `, query]
      : [`Viser alle `, number_of_results_element, ` ${product_form}`];
  },
  get_showing_pages_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const page_form = number_of_results === 1 ? "side" : "sider";
    return has_query
      ? [`Fant `, number_of_results_element, ` ${page_form} for `, query]
      : [`Fant `, number_of_results_element, ` ${page_form}`];
  },
  modal_view_all_no_results_: "Vis alternativer",
} as const;
