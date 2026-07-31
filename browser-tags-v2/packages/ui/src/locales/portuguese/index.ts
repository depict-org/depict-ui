import { english_category_translation, english_search_translation } from "../english";
import { category_i18n, search_i18n } from "../i18n_types";

const portuguese_base_translation = {
  "of_": "de",
  "sorting_text_": "Ordenar",
  "filter_text_": "Filtrar",
  "filters_": "Filtros",
  "clear_all_from_filter_crumbs_": "Limpar tudo",
  "clear_all_filters_from_big_button_": "Limpar todos os filtros",
  "view_more_": "Ver mais",
  "view_less_": "Ver menos",
  "selected_filters_title_": "Filtros",
  "try_without_filters_": "Voltar a tentar sem filtros",
  "clear_individual_filter_": "Limpar",
  "range_filter_low_point_aria_label_": "Filtro com valor mais baixo",
  "range_filter_high_point_aria_label_": "Filtro com valor mais alto",
  "morphing_sign_expanded_aria_label_": "Minimizar secção",
  "morphing_sign_collapsed_aria_label_": "Expandir secção",
  "breadcrumbs_aria_label_": "Trilhos",
  search_a_filter_: (section: string) => `Pesquisar em « ${section} »`,
} as const;

export const portuguese_category_translation: category_i18n = {
  ...english_category_translation, // fallbacks for untranslated strings
  ...portuguese_base_translation,
  show_n_products_: (number_of_results: HTMLElement) => ["Mostrar ", number_of_results, " produtos"],
  "no_products_text_": "Não há produtos aqui",
  "product_": "produto",
  "products_": "produtos",
  "quicklinks_aria_label_": "Categorias",
};

export const portuguese_search_translation: search_i18n = {
  ...english_search_translation, // fallbacks for untranslated strings
  ...portuguese_base_translation,
  show_n_results_: (number_of_results: HTMLElement) => ["Mostar ", number_of_results, " resultado(s)"],
  modal_view_all_results_: (number_of_results: HTMLElement) => ["Ver todos os ", number_of_results, " resultados"],
  get_showing_results_for_: (
    q: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const singular = number_of_results === 1;
    return has_query
      ? [`A mostrar `, number_of_results_element, ` produto${singular ? "" : "s"} para `, q]
      : [`A mostrar todos os `, number_of_results_element, ` produto${singular ? "" : "s"}`];
  },
  get_showing_pages_for_: (
    q: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const singular = number_of_results === 1;
    return has_query
      ? [`Encontrada${singular ? "" : "s"} `, number_of_results_element, ` página${singular ? "" : "s"} para `, q]
      : [`Encontrada${singular ? "" : "s"} `, number_of_results_element, ` página${singular ? "" : "s"}`];
  },
  "no_products_": "Nenhum produto encontrado",
  "content_": "Conteúdo",
  "search_recs_title_": "Outras alternativas",
  "category_": "Categoria",
  "brand_": "Marca",
  "modal_discover_more_": "Descobrir mais",
  "previous_searches_text_": "As suas pesquisas anteriores",
  "suggestions_": "Sugestões",
  "no_results_text_": "Sem resultados",
  "clear_filters_query_sorting_after_submit_":
    "Limpar consulta. Limpar a seleção e os filtros depois do próximo envio.",
  "placeholder_text_": "Pesquisa",
  search_submit_button_aria_label_: "Pesquisa",
  "search_field_field_aria_label_": "Campo de consulta de pesquisa",
  "previous_searches_delete_entry_from_history_": "Remover consultas do histórico",
  listing_suggestions_: "Categorias & Coleções",
  previous_: "Anterior",
  popular_: "Popular",
  products_: "Produtos",
  modal_view_all_no_results_: "Ver alternativas",
} as const;
