import { english_category_translation, english_search_translation } from "../english";
import { category_i18n, search_i18n } from "../i18n_types";

const danish_base_translation = {
  "of_": "af",
  "sorting_text_": "Sorter",
  "filter_text_": "Filter",
  "filters_": "Filtre",
  "clear_all_from_filter_crumbs_": "Ryd alt",
  "clear_all_filters_from_big_button_": "Ryd alle filtre",
  "view_more_": "Vis mere",
  "view_less_": "Vis mindre",
  "selected_filters_title_": "Filtre",
  "try_without_filters_": "Prøv igen uden filtre",
  "clear_individual_filter_": "Ryd",
  "range_filter_low_point_aria_label_": "Områdefiltrets lavere værdi",
  "range_filter_high_point_aria_label_": "Områdefiltrets højere værdi",
  "morphing_sign_expanded_aria_label_": "Skjul afsnit",
  "morphing_sign_collapsed_aria_label_": "Udvid afsnit",
  close_: "Luk",
  ok_: "OK",
  filters_cleared_: "Filtre ryddet",
  we_cleared_your_filters_: "Vi har ryddet dine filtre",
  restore_: "Gendan",
  open_sorting_: "Åben sortering",
  close_sorting_: "Luk sortering",
  open_filters_: "Åbn filtre",
  close_filters_: "Luk filtre",
  back_: "Tilbage",
  scroll_to_top_: "Rul til top",
  "breadcrumbs_aria_label_": "Brødkrummer",
  search_a_filter_: (section: string) => `Søg ${section.toLowerCase()}`,
} as const;

export const danish_category_translation: category_i18n = {
  ...english_category_translation, // fallbacks for untranslated strings
  ...danish_base_translation,
  show_n_products_: (number_of_results: HTMLElement) => ["Vis ", number_of_results, " produkter"],
  "no_products_text_": "Der er ingen produkter her, desværre",
  "product_": "produkt",
  "products_": "produkter",
  "quicklinks_aria_label_": "Kategorier",
};

export const danish_search_translation: search_i18n = {
  ...english_search_translation, // fallbacks for untranslated strings
  ...danish_base_translation,
  show_n_results_: (number_of_results: HTMLElement) => ["Vis ", number_of_results, " resultat(er)"],
  "clear_filters_query_sorting_after_submit_": "Ryd søgning. Ryd også sortering og filtre før næste forsøg.",
  "no_results_text_": "Ingen resultater",
  modal_view_all_results_: (number_of_results: HTMLElement) => ["Vis alle ", number_of_results, " resultat(er)"],
  "search_recs_title_": "Andre alternativer",
  "category_": "Kategori",
  "brand_": "Mærke",
  "suggestions_": "Forslag",
  "modal_discover_more_": "Opdag mere",
  "previous_searches_text_": "Dine tidligere søgninger",
  "placeholder_text_": "Søgning",
  "search_submit_button_aria_label_": "Søgning",
  "content_": "Indhold",
  "no_products_": "Ingen produkter fundet",
  "search_field_field_aria_label_": "Felt til søgning",
  "previous_searches_delete_entry_from_history_": "Fjern forespørgsel fra historik",
  listing_suggestions_: "Kategorier & Kollektioner",
  previous_: "Forrige",
  popular_: "Populære",
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
      ? [`Fandt `, number_of_results_element, ` ${page_form} for `, query]
      : [`Fandt `, number_of_results_element, ` ${page_form}`];
  },
  modal_view_all_no_results_: "Se alternativer",
} as const;
