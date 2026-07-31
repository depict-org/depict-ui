import { english_category_translation, english_search_translation } from "../english";
import { category_i18n, search_i18n } from "../i18n_types";

const dutch_base_translation = {
  "of_": "van",
  "sorting_text_": "Sorteren",
  "filter_text_": "Filter",
  "filters_": "Filters",
  "clear_all_from_filter_crumbs_": "Alles wissen",
  "clear_all_filters_from_big_button_": "Alle filters wissen",
  "view_more_": "Toon meer",
  "view_less_": "Toon minder",
  "selected_filters_title_": "Filters",
  "try_without_filters_": "Nieuwe poging zonder filters",
  "clear_individual_filter_": "Wissen",
  "range_filter_low_point_aria_label_": "Bereikfilter lagere waarde",
  "range_filter_high_point_aria_label_": "Bereikfilter hogere waarde",
  "morphing_sign_expanded_aria_label_": "Sectie samenvouwen",
  "morphing_sign_collapsed_aria_label_": "Sectie openvouwen",
  close_: "Sluiten",
  ok_: "OK",
  filters_cleared_: "Filters zijn gewist",
  we_cleared_your_filters_: "We hebben u filters gewist",
  restore_: "Herstellen",
  open_sorting_: "Sorteren openen",
  close_sorting_: "Sorteren sluiten",
  open_filters_: "Filters openen",
  close_filters_: "Filters sluiten",
  back_: "Terug",
  scroll_to_top_: "Naar boven scrollen",
  "breadcrumbs_aria_label_": "Kruimelspoor",
  search_a_filter_: (section: string) => `Zoeken ${section.toLowerCase()}`,
} as const;

export const dutch_category_translation: category_i18n = {
  ...english_category_translation, // fallbacks for untranslated strings
  ...dutch_base_translation,
  show_n_products_: (number_of_results: HTMLElement) => ["Toon ", number_of_results, " producten"],
  "no_products_text_": "Sorry, hier zijn geen producten",
  "product_": "product",
  "products_": "producten",
  "quicklinks_aria_label_": "Categorieën",
};

export const dutch_search_translation: search_i18n = {
  ...english_search_translation, // fallbacks for untranslated strings
  ...dutch_base_translation,
  show_n_results_: (number_of_results: HTMLElement) => ["Toon ", number_of_results, " resulta(a)t(en)"],
  modal_view_all_results_: (number_of_results: HTMLElement) => ["Bekijk alle ", number_of_results, " resulta(a)t(en)"],
  get_showing_results_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const product_form = number_of_results === 1 ? "product" : "producten";
    return has_query
      ? [number_of_results_element, ` ${product_form} voor `, query, " worden getoond"]
      : [`Alle `, number_of_results_element, ` ${product_form} worden getoond`];
  },
  get_showing_pages_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const page_form = number_of_results === 1 ? "pagina" : "pagina's";
    return has_query
      ? [`Gevonden `, number_of_results_element, ` ${page_form} voor `, query]
      : [`Gevonden `, number_of_results_element, ` ${page_form}`];
  },
  "search_recs_title_": "Andere opties",
  "category_": "Categorie",
  "brand_": "Merk",
  "content_": "Inhoud",
  "no_products_": "Geen producten gevonden",
  "modal_discover_more_": "Ontdek meer",
  "previous_searches_text_": "vorige zoekopdrachten",
  "suggestions_": "Suggesties",
  "no_results_text_": "Geen resultaten",
  "clear_filters_query_sorting_after_submit_":
    "Zoekopdracht wissen. Wis ook sortering en filters na volgende verzending.",
  "placeholder_text_": "Zoeken",
  search_submit_button_aria_label_: "Zoeken",
  "search_field_field_aria_label_": "Zoeken met zoekveld",
  "previous_searches_delete_entry_from_history_": "Verwijder zoekopdracht uit geschiedenis",
  listing_suggestions_: "Categorieën & Collecties",
  previous_: "Vorige",
  popular_: "Populair",
  products_: "Producten",
  modal_view_all_no_results_: "Bekijk alternatieven",
} as const;
