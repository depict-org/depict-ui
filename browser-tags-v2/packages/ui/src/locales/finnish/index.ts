import { english_category_translation, english_search_translation } from "../english";
import { category_i18n, search_i18n } from "../i18n_types";

const finnish_base_translation = {
  "of_": "/",
  "sorting_text_": "Lajittele",
  "filter_text_": "Suodata",
  "filters_": "Suodattimet",
  "clear_all_from_filter_crumbs_": "Tyhjennä",
  "clear_all_filters_from_big_button_": "Poista valinnat",
  "view_more_": "Näytä Lisää",
  "view_less_": "Näytä Vähemmän",
  "selected_filters_title_": "Suodattimet",
  "try_without_filters_": "Hae uudestaan ilman suodattimia",
  "clear_individual_filter_": "Poista valinnat",
  "range_filter_low_point_aria_label_": "Hintasuodattimen alempi arvo",
  "range_filter_high_point_aria_label_": "Hintasuodattimen ylempi arvo",
  "morphing_sign_expanded_aria_label_": "Pienennä osio",
  "morphing_sign_collapsed_aria_label_": "Laajenna osio",
  close_: "Sulje",
  ok_: "OK",
  filters_cleared_: "Suodattimet tyhjennetty",
  we_cleared_your_filters_: "Tyhjensimme suodattimesi",
  restore_: "Palauta",
  open_sorting_: "Avaa lajittelu",
  close_sorting_: "Sulje lajittelu",
  open_filters_: "Avaa suodattimet",
  close_filters_: "Sulje suodattimet",
  back_: "Takaisin",
  scroll_to_top_: "Vieritä ylös",
  "breadcrumbs_aria_label_": "Murupolut",
  search_a_filter_: (section: string) => `Etsi ${section.toLowerCase()}`,
} as const;

export const finnish_category_translation: category_i18n = {
  ...english_category_translation, // fallbacks for untranslated strings
  ...finnish_base_translation,
  show_n_products_: (number_of_results: HTMLElement) => ["Näytä ", number_of_results, " tuotetta"],
  "no_products_text_": "Valitettavasti täällä ei ole tuotteita",
  "product_": "tuote",
  "products_": "tuotteet",
  "quicklinks_aria_label_": "Kategoriat",
};

export const finnish_search_translation: search_i18n = {
  ...english_search_translation, // fallbacks for untranslated strings
  ...finnish_base_translation,
  show_n_results_: (number_of_results: HTMLElement) => ["Näytä kaikki ", number_of_results, " tulosta"],
  "previous_searches_text_": "Aikaisemmat hakusi",
  "suggestions_": "Ehdotukset",
  "no_results_text_": "Ei tuloksia",
  modal_view_all_results_: (number_of_results: HTMLElement) => ["Näytä Kaikki ", number_of_results, " tulosta"],
  "clear_filters_query_sorting_after_submit_": "Tyhjennä valinnat uuden haun alkaessa",
  "category_": "Kategoria",
  "brand_": "Merkki",
  "modal_discover_more_": "Katso lisää",
  get_showing_results_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const product_form = number_of_results === 1 ? "tuote" : "tuotetta";
    return has_query
      ? [`Näytetään `, number_of_results_element, ` ${product_form} haulle `, query]
      : [`Näytetään kaikki `, number_of_results_element, ` ${product_form}`];
  },
  get_showing_pages_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const page_form = number_of_results === 1 ? "sivu" : "sivua";
    return has_query
      ? [`Löytyi `, number_of_results_element, ` ${page_form} haulle `, query]
      : [`Löytyi `, number_of_results_element, ` ${page_form}`];
  },
  "no_products_": "Tuotteita ei löytynyt",
  "search_recs_title_": "Muita vaihtoehtoja",
  "placeholder_text_": "Hae",
  "content_": "Sisältö",
  search_submit_button_aria_label_: "Hae",
  "search_field_field_aria_label_": "Hakukenttä",
  "previous_searches_delete_entry_from_history_": "Poista haku historiasta",
  listing_suggestions_: "Kategoriat & Kokoelmat",
  previous_: "Edellinen",
  popular_: "Suosittu",
  products_: "Tuotteet",
  modal_view_all_no_results_: "Näytä vaihtoehdot",
} as const;
