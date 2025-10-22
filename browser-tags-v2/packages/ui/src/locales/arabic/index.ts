import { category_i18n, search_i18n } from "../i18n_types";

const arabic_base_translation = {
  backend_locale_: "", // Set to empty string to pass type validation here. We add these where we export the locales in index.ts since the language parts are very much the same right now.
  "of_": "من",
  "sorting_text_": "ترتيب",
  "filter_text_": "تصفية",
  "filters_": "التصفيات",
  "clear_all_from_filter_crumbs_": "مسح الكل",
  "clear_all_filters_from_big_button_": "مسح جميع التصفيات",
  "view_more_": "عرض المزيد",
  "view_less_": "عرض أقل",
  "selected_filters_title_": "التصفيات",
  "try_without_filters_": "حاول مرة أخرى بدون تصفيات",
  "clear_individual_filter_": "مسح",
  range_filter_low_point_aria_label_: "القيمة الأدنى لتصفية النطاق",
  range_filter_high_point_aria_label_: "القيمة الأعلى لتصفية النطاق",
  morphing_sign_expanded_aria_label_: "طي القسم",
  morphing_sign_collapsed_aria_label_: "توسيع القسم",
  close_: "إغلاق",
  ok_: "موافق",
  filters_cleared_: "تم مسح التصفيات",
  we_cleared_your_filters_: "لقد قمنا بمسح التصفيات الخاصة بك",
  restore_: "استعادة",
  open_sorting_: "فتح الترتيب",
  close_sorting_: "إغلاق الترتيب",
  open_filters_: "فتح التصفيات",
  close_filters_: "إغلاق التصفيات",
  back_: "رجوع",
  scroll_to_top_: "التمرير إلى الأعلى",
  search_a_filter_: (section: string) => `بحث في ${section}`,
  breadcrumbs_aria_label_: "مسار التنقل",
  breadcrumbs_separator_: "/",
  /** Fallback price formatting */
  price_formatting_: {
    pre_: "",
    post_: "",
    decimal_places_delimiter_: ".",
    thousands_delimiter_: ",",
    places_after_comma_: 2,
  },
} as const;

export const arabic_category_translation: category_i18n = {
  ...arabic_base_translation,
  show_n_products_: (number_of_results: HTMLElement) => ["عرض ", number_of_results, " منتج"],
  no_products_text_: "لا توجد منتجات هنا، نأسف",
  product_: "منتج",
  products_: "منتجات",
  quicklinks_aria_label_: "الفئات",
} as const;

export const arabic_search_translation: search_i18n = {
  ...arabic_base_translation,
  show_n_results_: (number_of_results: HTMLElement) => ["عرض ", number_of_results, " نتيجة"],
  modal_view_all_results_: (number_of_results: HTMLElement) => ["عرض جميع ", number_of_results, " النتائج"],
  "search_recs_title_": "بدائل أخرى",
  "category_": "الفئة",
  "brand_": "العلامة التجارية",
  "modal_discover_more_": "اكتشف المزيد",
  "previous_searches_text_": "عمليات البحث السابقة",
  "suggestions_": "اقتراحات",
  "no_results_text_": "لا توجد نتائج",
  "clear_filters_query_sorting_after_submit_": "مسح الاستعلام. سيتم أيضاً مسح الترتيب والتصفيات بعد الإرسال التالي.",
  "placeholder_text_": "بحث",
  "no_products_": "لم يتم العثور على منتجات",
  "content_": "المحتوى",
  search_submit_button_aria_label_: "بحث",
  search_field_field_aria_label_: "حقل استعلام البحث",
  previous_searches_delete_entry_from_history_: "إزالة الاستعلام من السجل",
  listing_suggestions_: "الفئات والمجموعات",
  previous_: "السابق",
  popular_: "شائع",
  products_: "منتجات",
  get_showing_results_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const product_form = number_of_results === 1 ? "منتج" : "منتجات";
    return has_query
      ? [`عرض `, number_of_results_element, ` ${product_form} لـ `, query]
      : [`عرض جميع `, number_of_results_element, ` ${product_form}`];
  },
  get_showing_pages_for_: (
    query: HTMLElement,
    number_of_results_element: HTMLElement,
    has_query: boolean,
    number_of_results: number | undefined
  ) => {
    const page_form = number_of_results === 1 ? "صفحة" : "صفحات";
    return has_query
      ? [`تم العثور على `, number_of_results_element, ` ${page_form} لـ `, query]
      : [`تم العثور على `, number_of_results_element, ` ${page_form}`];
  },
  modal_view_all_no_results_: "عرض البدائل",
} as const;

