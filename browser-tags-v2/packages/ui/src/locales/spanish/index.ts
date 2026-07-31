import { english_category_translation, english_search_translation } from "../english";
import { category_i18n, search_i18n } from "../i18n_types";

const spanish_base_translation = {
  "of_": "de",
  "sorting_text_": "Clasificar",
  "filter_text_": "Filtrar",
  "filters_": "Filtros",
  "clear_all_from_filter_crumbs_": "Limpiar todo",
  "clear_all_filters_from_big_button_": "Borrar todos los filtros",
  "view_more_": "Ver más",
  "view_less_": "Ver menos",
  "selected_filters_title_": "Filtros",
  "try_without_filters_": "Inténtalo de nuevo sin filtros",
  "clear_individual_filter_": "Limpiar",
  "range_filter_low_point_aria_label_": "Valor más bajo del filtro de rango",
  "range_filter_high_point_aria_label_": "Valor más alto del filtro de rango",
  "morphing_sign_expanded_aria_label_": "Contraer sección",
  "morphing_sign_collapsed_aria_label_": "Ampliar sección",
  close_: "Cerrar",
  ok_: "OK",
  filters_cleared_: "Filtros borrados",
  we_cleared_your_filters_: "Hemos borrado los filtros",
  restore_: "Restaurar",
  open_sorting_: "Abrir clasificación",
  close_sorting_: "Cerrar clasificación",
  open_filters_: "Abrir filtros",
  close_filters_: "Cerrar filtros",
  back_: "Atrás",
  scroll_to_top_: "Ir al principio",
  "breadcrumbs_aria_label_": "Rastro",
  search_a_filter_: (section: string) => `Buscar en « ${section} »`,
} as const;

export const spanish_category_translation: category_i18n = {
  ...english_category_translation, // fallbacks for untranslated strings
  ...spanish_base_translation,
  show_n_products_: (number_of_results: HTMLElement) => ["Mostrar ", number_of_results, " productos"],
  "no_products_text_": "No hay productos aquí, lo siento",
  "product_": "producto",
  "products_": "productos",
  "quicklinks_aria_label_": "Categorías",
};

export const spanish_search_translation: search_i18n = {
  ...english_search_translation, // fallbacks for untranslated strings
  ...spanish_base_translation,
  show_n_results_: (number_of_results: HTMLElement) => ["Mostrar ", number_of_results, " resultado/s"],
  modal_view_all_results_: (number_of_results: HTMLElement) => ["Ver todos los ", number_of_results, " resultados"],
  get_showing_results_for_: (
    q: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const singular = number_of_results === 1;
    return has_query
      ? [`Mostrando `, number_of_results_element, ` producto${singular ? "" : "s"} para `, q]
      : [`Mostrando todos los `, number_of_results_element, ` producto${singular ? "" : "s"}`];
  },
  get_showing_pages_for_: (
    q: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const singular = number_of_results === 1;
    return has_query
      ? [`Encontrado${singular ? "" : "s"} `, number_of_results_element, ` página${singular ? "" : "s"} para `, q]
      : [`Encontrado${singular ? "" : "s"} `, number_of_results_element, ` página${singular ? "" : "s"}`];
  },
  "search_recs_title_": "Otras alternativas",
  "category_": "Categoría",
  "content_": "Contenido",
  "no_products_": "No se encontraron productos",
  "brand_": "Marca",
  "modal_discover_more_": "Descubrir más",
  "previous_searches_text_": "Tus búsquedas anteriores",
  "suggestions_": "Sugerencias",
  "no_results_text_": "No hay resultados",
  "clear_filters_query_sorting_after_submit_":
    "Borrar consulta. Eliminar también la selección y los filtros después del próximo envío.",
  "placeholder_text_": "Búsqueda",
  search_submit_button_aria_label_: "Búsqueda",
  "search_field_field_aria_label_": "Campo de consulta de búsqueda",
  "previous_searches_delete_entry_from_history_": "Eliminar consulta del historial",
  listing_suggestions_: "Categorías & Colecciones",
  previous_: "Anterior",
  popular_: "Popular",
  products_: "Productos",
  modal_view_all_no_results_: "Ver alternativas",
} as const;
