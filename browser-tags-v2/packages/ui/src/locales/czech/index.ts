import { english_category_translation, english_search_translation } from "../english";
import { category_i18n, search_i18n } from "../i18n_types";

const czech_base_translation = {
  "of_": "z",
  "sorting_text_": "Třídit",
  "filter_text_": "Filtr",
  "filters_": "Filtry",
  "clear_all_from_filter_crumbs_": "Vymazat vše",
  "clear_all_filters_from_big_button_": "Vymazat všechny filtry",
  "view_more_": "Zobrazit více",
  "view_less_": "Zobrazit méně",
  "selected_filters_title_": "Filtry",
  "try_without_filters_": "Zkusit znovu bez filtrů",
  "clear_individual_filter_": "Vymazat",
  "range_filter_low_point_aria_label_": "Dolní hodnota rozsahu filtru",
  "range_filter_high_point_aria_label_": "Horní hodnota rozsahu viltru",
  "morphing_sign_expanded_aria_label_": "Sbalit oddíl",
  "morphing_sign_collapsed_aria_label_": "Rozbalit oddíl",
  close_: "Zavřít",
  ok_: "OK",
  filters_cleared_: "Filtry vyčištěny",
  we_cleared_your_filters_: "Vyčistili jsme vaše filtry",
  restore_: "Obnovit",
  open_sorting_: "Otevřít řazení",
  close_sorting_: "Zavřít řazení",
  open_filters_: "Otevřít filtry",
  close_filters_: "Zavřít filtry",
  back_: "Zpět",
  scroll_to_top_: "Přejít nahoru",
  "breadcrumbs_aria_label_": "Drobečková navigace",
  search_a_filter_: (section: string) => `Hledat ${section.toLowerCase()}`,
} as const;

export const czech_category_translation: category_i18n = {
  ...english_category_translation, // fallbacks for untranslated strings
  ...czech_base_translation,
  show_n_products_: (number_of_results: HTMLElement) => ["Zobrazit ", number_of_results, " výrobků"],
  "no_products_text_": "Zde nejsou žádné výrobky, je nám líto",
  "product_": "výrobek",
  "products_": "výrobky",
  "quicklinks_aria_label_": "Kategorie",
};

export const czech_search_translation: search_i18n = {
  ...english_search_translation, // fallbacks for untranslated strings
  ...czech_base_translation,
  show_n_results_: (number_of_results: HTMLElement) => ["Zobrazit ", number_of_results, " výsledek/ky/ků"],
  modal_view_all_results_: (number_of_results: HTMLElement) => [
    "Zobrazit všech(ny) ",
    number_of_results,
    " výsledků/ky",
  ],
  get_showing_results_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    let product_form = "výrobků";
    if (number_of_results === 1) {
      product_form = "výrobek";
    } else if (number_of_results! > 1 && number_of_results! < 5) {
      product_form = "výrobky";
    }

    return has_query
      ? [`Zobrazuje se `, number_of_results_element, ` ${product_form} pro `, query]
      : [`Zobrazují se všechny `, number_of_results_element, ` ${product_form}`];
  },
  get_showing_pages_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    let page_form = "stránek";
    if (number_of_results === 1) {
      page_form = "stránka";
    } else if (number_of_results! > 1 && number_of_results! < 5) {
      page_form = "stránky";
    }

    return has_query
      ? [`Nalezeno `, number_of_results_element, ` ${page_form} pro `, query]
      : [`Nalezeno `, number_of_results_element, ` ${page_form}`];
  },
  "search_recs_title_": "Další možnosti",
  "category_": "Kategorie",
  "brand_": "Značka",
  "modal_discover_more_": "Objevte více",
  "previous_searches_text_": "Vaše předchozí hledání",
  "content_": "Obsah",
  "suggestions_": "Návrhy",
  "no_results_text_": "Žádné výsledky",
  "no_products_": "Žádné produkty nebyly nalezeny",
  "clear_filters_query_sorting_after_submit_": "Vymazat dotaz. Vymazat i třídění a filtry po příštím odeslání.",
  "placeholder_text_": "Hledání",
  search_submit_button_aria_label_: "Hledání",
  "search_field_field_aria_label_": "Políčko dotazu hledání",
  "previous_searches_delete_entry_from_history_": "Odebrat dotaz z historie",
  listing_suggestions_: "Kategorie & Kolekce",
  previous_: "Předchozí",
  popular_: "Populární",
  products_: "Produkty",
  modal_view_all_no_results_: "Zobrazit alternativy",
} as const;
