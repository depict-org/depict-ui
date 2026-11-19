import { english_category_translation, english_search_translation } from "../english";
import { category_i18n, search_i18n } from "../i18n_types";

const italian_base_translation = {
  "of_": "di",
  "sorting_text_": "Ordina",
  "filter_text_": "Filtro",
  "filters_": "Filtri",
  "clear_all_from_filter_crumbs_": "Elimina tutto",
  "clear_all_filters_from_big_button_": "Elimina tutti i filtri",
  "view_more_": "Mostra di più",
  "view_less_": "Mostra di meno",
  "selected_filters_title_": "Filtri",
  "try_without_filters_": "Riprova senza filtri",
  "clear_individual_filter_": "Elimina",
  "range_filter_low_point_aria_label_": "Valore inferiore del filtro di intervallo",
  "range_filter_high_point_aria_label_": "Valore superiore del filtro di intervallo",
  "morphing_sign_expanded_aria_label_": "Comprimi sezione",
  "morphing_sign_collapsed_aria_label_": "Espandi sezione",
  close_: "Chiudi",
  ok_: "OK",
  filters_cleared_: "Filtri cancellati",
  we_cleared_your_filters_: "Abbiamo cancellato i tuoi filtri",
  restore_: "Ripristina",
  open_sorting_: "Apri selezione",
  close_sorting_: "Chiudi selezione",
  open_filters_: "Apri filtri",
  close_filters_: "Chiudi filtri",
  back_: "Indietro",
  scroll_to_top_: "Scorri verso l'alto",
  "breadcrumbs_aria_label_": "Navigazione",
  search_a_filter_: (section: string) => `Cerca in « ${section} »`,
} as const;

export const italian_category_translation: category_i18n = {
  ...english_category_translation, // fallbacks for untranslated strings
  ...italian_base_translation,
  show_n_products_: (number_of_results: HTMLElement) => ["Mostra ", number_of_results, " prodotti"],
  "no_products_text_": "Spiacenti, qui non ci sono prodotti",
  "product_": "prodotto",
  "products_": "prodotti",
  "quicklinks_aria_label_": "Categorie",
};

export const italian_search_translation: search_i18n = {
  ...english_search_translation, // fallbacks for untranslated strings
  ...italian_base_translation,
  show_n_results_: (number_of_results: HTMLElement) => ["Mostra ", number_of_results, " risultati"],
  modal_view_all_results_: (number_of_results: HTMLElement) => ["Visualizza tutti i ", number_of_results, " risultati"],
  get_showing_results_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const product_form = number_of_results === 1 ? "prodotto" : "prodotti";
    return has_query
      ? [`Visualizzazione di `, number_of_results_element, ` ${product_form} per `, query]
      : [`Visualizzazione di tutti i `, number_of_results_element, ` ${product_form}`];
  },
  get_showing_pages_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const page_form = number_of_results === 1 ? "pagina" : "pagine";
    return has_query
      ? [`Trovato `, number_of_results_element, ` ${page_form} per `, query]
      : [`Trovato `, number_of_results_element, ` ${page_form}`];
  },
  "no_products_": "Nessun prodotto trovato",
  "content_": "Contenuto",
  "search_recs_title_": "Altre alternative",
  "category_": "Categoria",
  "brand_": "Marca",
  "modal_discover_more_": "Scopri di più",
  "previous_searches_text_": "Le tue ricerche precedenti",
  "suggestions_": "Suggerimenti",
  "no_results_text_": "Nessun risultato",
  "clear_filters_query_sorting_after_submit_":
    "Cancella query. Cancella anche selezione e filtri dopo il prossimo invio.",
  "placeholder_text_": "Ricerca",
  search_submit_button_aria_label_: "Ricerca",
  "search_field_field_aria_label_": "Cerca campo query",
  "previous_searches_delete_entry_from_history_": "Rimuovi query dalla cronologia",
  listing_suggestions_: "Categorie & Collezioni",
  previous_: "Precedente",
  popular_: "Popolare",
  products_: "Prodotti",
  modal_view_all_no_results_: "Visualizza alternative",
} as const;
