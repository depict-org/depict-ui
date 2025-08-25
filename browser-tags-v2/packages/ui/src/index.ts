/*! Depict.ai search and product listing SDK */
import { version } from "./version";
import { add_to_version_info } from "@depict-ai/utilishared";

export { usePLPLayout } from "./category_listing/CategoryPage";
export { makeSizeAccessors } from "./shared/components/shopify/makeSizeAccessors";
export {
  setExtraDisplayTransformers,
  getExtraDisplayTransformers,
} from "./shared/helper_functions/extraDisplayTransformers";
export { ModernResponsiveImage } from "./shared/components/ModernResponsiveContainedImage";
export { remap_blocks_to_index } from "./shared/components/PLPResults/create_content_blocks";
export { useMobileHover } from "./shared/helper_functions/useMobileHover";
export { useVisibilityState } from "./shared/helper_functions/useVisibilityState";
export { useSlidableInformation } from "./shared/components/SlidableItems";
export {
  useProductCardIsVisible,
  CurrentlyIntersectingContext,
} from "./shared/helper_functions/card_rendering/renderDisplaysWithIntersectionObserver";
export { useExpandingContainerReactive } from "./shared/helper_functions/expanding_container_with_reactive_kids";
export { SDKLooksSliderOrGrid as LooksSliderOrGrid } from "./sdks/LooksSliderOrGrid";
export { LookCard as LookCard } from "./shared/components/Looks/LookCard";
export { PseudoRouter } from "./shared/helper_functions/pseudo_router";
export { promiseSafeStructuredClone } from "./shared/helper_functions/promiseSafeStructuredClone";
export {
  preserve_items_in_history_dot_state,
  prefixes_to_preserve_in_history_dot_state,
} from "./shared/helper_functions/preserve_items_in_history_dot_state";
export { allowNativeNavigation } from "./shared/helper_functions/allowNativeNavigation";
export { modalVersionSymbol } from "./search/helper_functions/modalVersionSymbol";
export type { ModalAlignmentSignals } from "./search/helper_functions/align_field";
export { createDeparallelizedNoDropResource } from "./shared/helper_functions/createDeparallelizedNoDropResource";
export { throw_globally } from "./shared/helper_functions/throw_globally";
export { ClassicSearchModal } from "./search/components/modal/classic/ClassicSearchModal";
export { SearchModalV2 } from "./search/components/modal/v2/SearchModalV2";
export { ModernResponsiveContainedImage } from "./shared/components/ModernResponsiveContainedImage";
export type { ListingQuery } from "./sdks/types";
export { Tab, Tabs } from "./shared/components/Tabs";
export { ShopTheLookButton } from "./shared/components/ShopTheLook/ShopTheLookButton";
export { history_dot_state_to_state } from "./shared/helper_functions/history_dot_state_to_state";
export type { ContentBlocksByRow, ContentBlock } from "./shared/components/PLPResults/create_content_blocks";
export { strip_encoded_filter_and_sort } from "./shared/url_state/encoding";
export { encode_filters, decode_filters } from "./shared/url_state/encoding";
export { encode_sorting, decode_sorting } from "./shared/url_state/encoding";
export { shopifyContainedImageContextSymbol } from "./shared/components/shopify/ShopifyContainedImage";
export { ListingProvider, useListing } from "./shared/helper_functions/ListingContext";
export { ProductCardIndexProvider, useProductCardIndex } from "./shared/helper_functions/ProductCardIndexContext";
export { ShopifyContainedImage } from "./shared/components/shopify/ShopifyContainedImage";
export { SlidableItems } from "./shared/components/SlidableItems";
export { make_accurate_width_accessor } from "./shared/helper_functions/make_accurate_width_accessor";
export { SDKRecommendationSlider as RecommendationSlider } from "./sdks/recommendation_slider";
export { SDKRecommendationGrid as RecommendationGrid } from "./sdks/recommendation_grid";
export { ShopifyResponsiveImg } from "./shared/components/shopify/ResponsiveImg";
export { ImageContainer } from "./shared/components/shopify/ImageContainer";
export { SentryErrorBoundary, ExtraSentryContextProvider } from "./shared/components/SentryErrorBoundary";
export { ExpandingDetails } from "./shared/components/ExpandingDetails";
export { accessor_of_object_to_object_with_accessor_values } from "./shared/helper_functions/accessor_of_object_to_object_with_accessor_values";
export { SelectedFilters } from "./shared/components/SelectedFilters";
export { FilterBody } from "./shared/components/SortAndFilter/FilterBody";
export { create_modified_filters } from "./shared/components/SortAndFilter/FilterBody/create_modified_filters";
export { SolidLayout, SolidLayoutWithProvidedElement } from "./shared/components/SolidLayout";
export type { SolidLayoutOptions } from "./shared/components/SolidLayout";
export type { ModernDisplayWithPageUrl } from "./shared/display_transformer_types";
export { modal_opener as general_modal_abstraction } from "./search/helper_functions/modal_opener";
export { CrossIcon } from "./shared/components/icons/CrossIcon";
export { GenericSliderArrowButton } from "./shared/components/icons/GenericSliderArrowButton";
export type { OnNavigation } from "./shared/helper_functions/pseudo_router";
export type { SearchFilter } from "@depict-ai/types/api/SearchRequestV3";
export { fetchDepictRecommendations } from "./sdks/fetchDepictRecommendations";
export type { ExclusiveId } from "./sdks/fetchDepictRecommendations";
export { CategoryTitle } from "./category_listing/components/CategoryTitle";
export { embedded_num_products } from "./category_listing/helpers/embedded_num_products";
export { get_listings } from "./category_listing/helpers/get_listings";
export { DepictCategory } from "./sdks/category_listing";
export type { OpenModalArguments } from "./sdks/search";
export {
  DepictSearch,
  get_search_query_updating_blocked_signal,
  SDKSearchPageComponent as SearchPage,
} from "./sdks/search";
export type {
  BaseProviderConfig,
  BaseCategoryProviderConfig,
  BaseSearchProviderConfig,
  BaseSearchPageConfig,
  BaseCategoryPageConfig,
  BaseProductListingConfig,
} from "./sdks/types";
export { ProductCardError } from "./sdks/errors";
export { open_modal_with_alignment } from "./search/helper_functions/open_modal/open_modal";
export type { RenderCategorySuggestion } from "./search/components/CategorySuggestions";
export { DefaultInstantCardPlaceholder } from "./search/components/DefaultInstantCardPlaceholder";
export {
  align_field,
  ALIGN_TOP,
  ALIGN_WIDTH_ON_MODAL,
  ALIGN_LEFT,
  SET_CENTERED_LEFT,
} from "./search/helper_functions/align_field";
export { convert_sdk_cols_at_size_to_layout } from "./shared/helper_functions/cols_at_size_transformer/cols_at_size_transformer";
export type { SDKColsAtSize } from "./shared/helper_functions/cols_at_size_transformer/cols_at_size_transformer";
export type { SDKGridSpacing, FilterWithData } from "./shared/types";
export { styles_to_valid_css_string } from "./shared/helper_functions/css_properties_to_css_string/css_properties_to_css_string";
export { disable_scrolling } from "./search/helper_functions/disable_scrolling";
export { open_search_with_shift_slash } from "./search/helper_functions/open_search_with_shift_slash";
export type { WithRequired, SDKRenderingInfo, ProductCardTemplate } from "./shared/types";
export { DepictAPI } from "./shared/DepictAPI";
export { media_query_to_accessor } from "./shared/helper_functions/media_query_to_accessor";
export { setup_fast_leave } from "./shared/helper_functions/setup_fast_leave";
export { show_toast } from "./shared/helper_functions/show_toast";
export { SolidFormatPrice } from "./shared/helper_functions/solid_format_price";
export { connect_search_field_height_to_aligner_height } from "./shared/helper_functions/connect_search_field_height_to_aligner_height";
export { BasePlaceholder } from "./shared/components/Placeholders/BasePlaceholder";
export { TextPlaceholder } from "./shared/components/Placeholders/TextPlaceholder";
export { ImagePlaceholder } from "./shared/components/Placeholders/ImagePlaceholder";
export { PageReplacer } from "./shared/PageReplacer";
export { defaultGridSpacing, defaultColsAtSize, defaultCategoryTitlePlugin } from "./sdks/shared_defaults";
export type { SomethingTakingADisplayTransformers, DisplayTransformers } from "./shared/display_transformer_types";
export { version };
export { SDKSearchField as SearchField } from "./sdks/SDKSearchField";
export { SDKBreadCrumbs as BreadCrumbs } from "./sdks/SDKBreadCrumbsAndQuickLinks";
export { SDKQuickLinks as QuickLinks } from "./sdks/SDKBreadCrumbsAndQuickLinks";
export { SDKCategoryPage as CategoryPage } from "./sdks/SDKCategoryPage";

add_to_version_info("ui", version);
