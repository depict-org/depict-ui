import { english_category_translation, english_search_translation } from "../english";
import { category_i18n, search_i18n } from "../i18n_types";

const polish_base_translation = {
  "of_": "z",
  "sorting_text_": "Sortuj",
  "filter_text_": "Filtruj",
  "filters_": "Filtry",
  "clear_all_from_filter_crumbs_": "Wyczyść wszystkie",
  "clear_all_filters_from_big_button_": "Wyczyść wszystkie filtry",
  "view_more_": "Zobacz więcej",
  "view_less_": "Zobacz mniej",
  "selected_filters_title_": "Filtry",
  "try_without_filters_": "Spróbuj ponownie bez filtrów",
  "clear_individual_filter_": "Wyczyść",
  "range_filter_low_point_aria_label_": "Dolna wartość filtra zakresu",
  "range_filter_high_point_aria_label_": "Górna wartość filtra zakresu",
  "morphing_sign_expanded_aria_label_": "Zwiń sekcję",
  "morphing_sign_collapsed_aria_label_": "Rozwiń sekcję",
  close_: "Zamknij",
  ok_: "OK",
  filters_cleared_: "Filtry wyczyszczone",
  we_cleared_your_filters_: "Wyczyściliśmy twoje filtry",
  restore_: "Przywróć",
  open_sorting_: "Otwórz sortowanie",
  close_sorting_: "Zamknij sortowanie",
  open_filters_: "Otwórz filtry",
  close_filters_: "Zamknij filtry",
  back_: "Wstecz",
  scroll_to_top_: "Przewiń do góry",
  "breadcrumbs_aria_label_": "Nawigacja okruszkowa",
  search_a_filter_: (section: string) => `Szukaj ${section.toLowerCase()}`,
} as const;

export const polish_category_translation: category_i18n = {
  ...english_category_translation, // fallbacks for untranslated strings
  ...polish_base_translation,
  show_n_products_: (number_of_results: HTMLElement) => ["Wyświetl produkty: ", number_of_results],
  "no_products_text_": "Brak produktów, przepraszamy",
  "product_": "produkt",
  "products_": "produkty/produktów",
  "quicklinks_aria_label_": "Kategorie",
};

// jfc what's up with Polish?! Kudos to ChatGPT
const get_polish_form = (number: number | undefined, singular: string, few_form: string, many_form: string) => {
  if (number === undefined) return many_form;
  if (number === 1) return singular;

  const tens = number % 100;
  const units = number % 10;

  if (units >= 2 && units <= 4 && !(tens >= 12 && tens <= 14)) return few_form;

  return many_form;
};

export const polish_search_translation: search_i18n = {
  ...english_search_translation, // fallbacks for untranslated strings
  ...polish_base_translation,
  show_n_results_: (number_of_results: HTMLElement) => ["Wyświetl wyniki: ", number_of_results],
  modal_view_all_results_: (number_of_results: HTMLElement) => ["Zobacz wszystkie wyniki: ", number_of_results],
  get_showing_results_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const product_form = get_polish_form(number_of_results, "produkt", "produkty", "produktów");
    return has_query
      ? [`Wyświetlanie `, number_of_results_element, ` ${product_form} dla zapytania `, query]
      : [`Wyświetlanie wszystkich produktów: `, number_of_results_element];
  },
  get_showing_pages_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const page_form = get_polish_form(number_of_results, "strona", "strony", "stron");
    return has_query
      ? [`Znaleziono `, number_of_results_element, ` ${page_form} dla zapytania `, query]
      : [`Znaleziono `, number_of_results_element, ` ${page_form}`];
  },
  "no_products_": "Nie znaleziono produktów",
  "search_recs_title_": "Inne alternatywy",
  "category_": "Kategoria",
  "brand_": "Marka",
  "modal_discover_more_": "Zobacz więcej",
  "previous_searches_text_": "Twoje poprzednie wyszukiwania",
  "suggestions_": "Sugestie",
  "no_results_text_": "Brak wyników",
  "content_": "Treść",
  "clear_filters_query_sorting_after_submit_":
    "Wyczyść zapytanie. Wyczyść również sortowanie i filtry po następnym przesłaniu.",
  "placeholder_text_": "Wyszukaj",
  search_submit_button_aria_label_: "Wyszukaj",
  "search_field_field_aria_label_": "Pole wyszukiwania",
  "previous_searches_delete_entry_from_history_": "Usuń zapytanie z historii",
  listing_suggestions_: "Kategorie & Kolekcje",
  previous_: "Poprzedni",
  popular_: "Popularne",
  products_: "Produkty",
  modal_view_all_no_results_: "Zobacz alternatywy",
} as const;
