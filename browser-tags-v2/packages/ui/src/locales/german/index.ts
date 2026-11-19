import { english_category_translation, english_search_translation } from "../english";
import { category_i18n, search_i18n } from "../i18n_types";

const german_base_translation = {
  "of_": "von",
  "sorting_text_": "Sortieren",
  "filter_text_": "Filtern",
  "filters_": "Filtern",
  "clear_all_from_filter_crumbs_": "Alle löschen",
  "clear_all_filters_from_big_button_": "Alle Filter löschen",
  "view_more_": "Mehr anzeigen",
  "view_less_": "Weniger anzeigen",
  "selected_filters_title_": "Filter",
  "try_without_filters_": "Versuche erneut ohne Filter",
  "clear_individual_filter_": "Löschen",
  "range_filter_low_point_aria_label_": "Filterbereich niedrigster Wert",
  "range_filter_high_point_aria_label_": "Filterbereich höchster Wert",
  "morphing_sign_expanded_aria_label_": "Abschnitt einklappen",
  "morphing_sign_collapsed_aria_label_": "Abschnitt ausklappen",
  close_: "Schließen",
  ok_: "OK",
  filters_cleared_: "Filter gelöscht",
  we_cleared_your_filters_: "Wir haben die Filter gelöscht",
  restore_: "Wiederherstellen",
  open_sorting_: "Sortierung öffnen",
  close_sorting_: "Sortierung schließen",
  open_filters_: "Filter öffnen",
  close_filters_: "Filter schließen",
  back_: "Zurück",
  scroll_to_top_: "Zum Anfang scrollen",
  breadcrumbs_aria_label_: "Brotkrumennavigation",
  search_a_filter_: (section: string) => `In „${section}“ suchen`,
} as const;

export const german_category_translation: category_i18n = {
  ...english_category_translation, // fallbacks for untranslated strings
  ...german_base_translation,
  show_n_products_: (number_of_results: HTMLElement) => [number_of_results, " Produkte anzeigen"],
  "no_products_text_": "Keine Produkte hier, tut uns leid",
  product_: "Produkt",
  products_: "Produkte",
  quicklinks_aria_label_: "Kategorien",
} as const;

export const german_search_translation: search_i18n = {
  ...english_search_translation, // fallbacks for untranslated strings
  ...german_base_translation,
  show_n_results_: (number_of_results: HTMLElement) => ["Zeige ", number_of_results, " Ergebnis(se)"],
  "search_recs_title_": "Du magst vielleicht auch",
  modal_view_all_results_: (number_of_results: HTMLElement) => ["Alle ", number_of_results, " Ergebnis(se)"],
  "no_products_": "Keine Produkte gefunden",
  "no_results_text_": "Keine Ergebnisse",
  "previous_searches_text_": "Vorherige Suchanfragen",
  "content_": "Inhalt",
  "suggestions_": "Vorschläge",
  "category_": "Kategori",
  "brand_": "Marke",
  "clear_filters_query_sorting_after_submit_":
    "Suchanfrage löschen. Sortierung und Filter nach dem nächsten Senden ebenfalls löschen.",
  "modal_discover_more_": "Mehr erforschen",
  search_submit_button_aria_label_: "Suchen",
  previous_searches_delete_entry_from_history_: "Anfrage aus Verlauf löschen",
  "search_field_field_aria_label_": "Suchanfragenfeld",
  "placeholder_text_": "Suchen",
  listing_suggestions_: "Kategorien & Kollektionen",
  previous_: "Vorherige",
  popular_: "Beliebt",
  products_: "Produkte",
  get_showing_results_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const product_form = number_of_results === 1 ? "Produkt" : "Produkte";
    return has_query
      ? [number_of_results_element, ` ${product_form} für `, query]
      : [`Zeige alle `, number_of_results_element, ` ${product_form}`];
  },
  get_showing_pages_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const page_form = number_of_results === 1 ? "Seite" : "Seiten";
    return has_query
      ? [number_of_results_element, ` ${page_form} für `, query]
      : [number_of_results_element, ` ${page_form}`];
  },
  modal_view_all_no_results_: "Alternativen anzeigen",
} as const;
