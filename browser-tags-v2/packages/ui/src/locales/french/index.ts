import { english_category_translation, english_search_translation } from "../english";
import { category_i18n, search_i18n } from "../i18n_types";

const french_base_translation = {
  "of_": "de",
  "sorting_text_": "Trier",
  "filter_text_": "Filtre",
  "filters_": "Filtres",
  "clear_all_from_filter_crumbs_": "Effacer tout",
  "clear_all_filters_from_big_button_": "Effacer tous les filtres",
  "view_more_": "Afficher plus",
  "view_less_": "Afficher moins",
  "selected_filters_title_": "Filtres",
  "try_without_filters_": "Réessayer sans les filtres",
  "clear_individual_filter_": "Effacer",
  "range_filter_low_point_aria_label_": "Valeur inférieure du filtre de la gamme",
  "range_filter_high_point_aria_label_": "Valeur supérieure du filtre de la gamme",
  "morphing_sign_expanded_aria_label_": "Réduire la section",
  "morphing_sign_collapsed_aria_label_": "Agrandir la section",
  close_: "Fermer",
  ok_: "OK",
  filters_cleared_: "Filtres effacés",
  we_cleared_your_filters_: "Nous avons effacé vos filtres",
  restore_: "Restaurer",
  open_sorting_: "Ouvrir le tri",
  close_sorting_: "Fermer le tri",
  open_filters_: "Ouvrir les filtres",
  close_filters_: "Fermer les filtres",
  back_: "Retour",
  scroll_to_top_: "Faire défiler vers le haut",
  "breadcrumbs_aria_label_": "Fil d’Ariane",
  search_a_filter_: (section: string) => `Rechercher dans « ${section} »`,
} as const;

export const french_category_translation: category_i18n = {
  ...english_category_translation, // fallbacks for untranslated strings
  ...french_base_translation,
  show_n_products_: (number_of_results: HTMLElement) => ["Afficher ", number_of_results, " articles"],
  "no_products_text_": "Aucun article ici, désolé",
  "product_": "article",
  "products_": "articles",
  "quicklinks_aria_label_": "Catégories",
};

export const french_search_translation: search_i18n = {
  ...english_search_translation, // fallbacks for untranslated strings
  ...french_base_translation,
  show_n_results_: (number_of_results: HTMLElement) => ["Afficher ", number_of_results, " résultat(s)"],
  modal_view_all_results_: (number_of_results: HTMLElement) => ["Afficher les ", number_of_results, " résultats"],
  get_showing_results_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const product_form = number_of_results === 1 ? "produit" : "produits";
    return has_query
      ? [`Afficher `, number_of_results_element, ` ${product_form} pour `, query]
      : [`Afficher tous les `, number_of_results_element, ` ${product_form}`];
  },
  get_showing_pages_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const page_form = number_of_results === 1 ? "page" : "pages";
    return has_query
      ? [`Trouvé `, number_of_results_element, ` ${page_form} pour `, query]
      : [`Trouvé `, number_of_results_element, ` ${page_form}`];
  },
  "no_products_": "Aucun produit trouvé",
  "search_recs_title_": "Autres alternatives",
  "category_": "Catégorie",
  "brand_": "Marque",
  "modal_discover_more_": "Découvrir plus",
  "content_": "Contenu",
  "previous_searches_text_": "Vos recherches précédentes",
  "suggestions_": "Suggestions",
  "no_results_text_": "Aucun résultat",
  "clear_filters_query_sorting_after_submit_":
    "Effacer la demande. Effacer aussi le tri et les filtres après le prochain envoi.",
  "placeholder_text_": "Rechercher",
  search_submit_button_aria_label_: "Rechercher",
  "search_field_field_aria_label_": "Champ de requête Rechercher",
  "previous_searches_delete_entry_from_history_": "Supprimer une requête de l’historique",
  listing_suggestions_: "Catégories & Collections",
  previous_: "Précédent",
  popular_: "Populaire",
  products_: "Produits",
  modal_view_all_no_results_: "Voir les alternatives",
} as const;
