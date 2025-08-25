import { SDKColsAtSize } from "../shared/helper_functions/cols_at_size_transformer/cols_at_size_transformer";
import { SDKGridSpacing } from "../shared/types";
import { Display, ModernDisplay } from "@depict-ai/utilishared";
import { DisplayTransformers } from "../shared/display_transformer_types";
import * as IdTypes from "../category_listing/IdTypes";
import { SearchModalV2 } from "../search/components/modal/v2/SearchModalV2";
import { ClassicSearchModal } from "../search/components/modal/classic/ClassicSearchModal";

export type PossibleLayout = "grid" | "slider" | "slider-without-filters";

export type BaseProviderConfig<
  InputDisplay extends Display,
  PossibleTransformedDisplay extends ModernDisplay | never,
> = {
  /**
   * The merchant to use for the search.
   * @example "YOUR_MERCHANT", "stronger"
   */
  merchant: string;
  /**
   * The market to use for the search.
   * @example "YOUR_MARKET", "no", "en-de"
   */
  market: string;
  /**
   * Optional unique identifer of the user. Only necessary when performing server side requests to Depict. All Depict tooling has a fallback ID that will be used when this isn't specified, but if you make requests to Depict directly, you need to specify this everywhere.
   */
  sessionId?: string;
  /**
   * Custom metadata to be sent with each request to the Depict API. Only necessary if specifically instructed by Depict.
   */
  metaData?: Record<string, string>;
  /**
   * You can't have more than one instance of the same provider on the same page, unless you specify a unique instance key for each one.
   * This is because there's state in the URL and history.state and the state of the different instances would collide.
   * By setting this property, you can specify a unique key for each instance, so that the state of each instance is kept separate.
   * We recommend to just use an incrementing number for this, e.g. "1", "2", "3", ...
   */
  uniqueInstanceKeyForState?: string;
} & (InputDisplay extends ModernDisplay // kudos to chatGPT for typing help
  ? "page_url" extends keyof InputDisplay["variant_displays"][number]
    ? {
        /**
         * Functions that take in a list of categories, content search results or products and then can transform or enrich the data for each category, content search result or product card in a batched way.
         */
        displayTransformers: DisplayTransformers<InputDisplay, PossibleTransformedDisplay>;
      } // on modern displays, page_url_creator/display transformers can be specified if page_url exists, for staging sites
    : {
        /**
         * Functions that take in a list of categories, content search results or products and then can transform or enrich the data for each category, content search result or product card in a batched way.
         */
        displayTransformers: DisplayTransformers<InputDisplay, PossibleTransformedDisplay>;
      } // on modern displays, displayTransformers must be specified if page_url doesn't exist
  : {
      /**
       * Functions that take in a list of categories, content search results or products and then can transform or enrich the data for each category, content search result or product card in a batched way.
       */
      displayTransformers?: never;
    }); // on old displays, no displayTransformers  can be specified;

export type BaseSearchProviderConfig<
  InputDisplay extends Display,
  PossibleTransformedDisplay extends ModernDisplay | never,
> = {
  /**
   * The path to the search page.
   * @example "/search", "/sok"
   */
  searchPagePath: string;
  /**
   * The name of the url parameter that will be used for the search query.
   * @example "q", "search_query", "query"
   * @default "query"
   */
  urlParamName?: string;
  /**
   * Whether to enable category suggestions in the search modal and search page.
   * @default true
   */
  enableCategorySuggestions?: boolean;
  /**
   * Whether to enable content search in the search modal and search page.
   * @default false
   */
  enableContentSearch?: boolean;
  /**
   * The search modal component to use. You can switch between the classic and the new search modal. Provide one of the components here that you can import from the same package as the one you're using to see this message (`SearchModalV2` or `ClassicSearchModal`).
   * You also need to reflect the choice in SCSS, example:
   * ```scss
   * @use "@depict-ai/js-ui" as plp-styling with (
   *   $search-modal-layout: "v2" // or "classic"
   * );
   * ```
   * The default is SearchModalV2. That means that ClassicSearchModal can get tree-shaken if you use v2 but not vice-versa. To force SearchModalV2 from being tree-shaken, set process.env.NO_SEARCH_MODAL_DEFAULT to "true".
   */
  searchModalComponent?: typeof SearchModalV2<InputDisplay, PossibleTransformedDisplay> | typeof ClassicSearchModal;
};

export type BaseCategoryProviderConfig = {
  /**
   * The parameter `listing_id=` will override the regular category id that you have configured your SDK to use. You can consider the `listing_id` as an escape-hatch if you want to easily set a listing id.
   * However, if your page already sets a listing_id, you can disable this behaviour by setting this property to `true` (to avoid a conflict).
   */
  disableOverrideListingId?: boolean;
};

export interface BaseProductListingConfig {
  /**
   * How many columns to show at each media size.
   * @default
   * [[2, 901], [3, 1024], [4]]
   * @example
   * [[2, 901], [3, 1024], [4]]
   * means 2 columns at sizes up to 901px, 3 columns at sizes up to 1024px and after that 4 columns at any viewport size.
   */
  columnsAtSize?: SDKColsAtSize;
  /**
   * The spacing between products.
   * @default "2%"
   * @example
   * "2%", "10px", "1rem", {horizontal: "1%", vertical: "5px"}
   */
  gridSpacing?: SDKGridSpacing;
}

export interface BaseSearchPageConfig extends BaseProductListingConfig {
  /**
   * Whether to show the search input field in the search page.
   * @default true
   */
  includeInputField?: boolean;
}

export interface BaseCategoryPageConfig extends BaseProductListingConfig {
  /**
   * Whether to show the breadcrumbs in the category page.
   * @default true
   */
  showBreadcrumbs?: boolean;
  /**
   * Whether to show the quicklinks in the category page.
   * @default true
   */
  showQuicklinks?: boolean;
  /**
   * The layout used for listing the products.
   *     1. `"grid"` is the default and shows the products in a grid
   *     2. `"slider"` shows the products in a slider and has default `false` for showBreadcrumbs and showQuicklinks
   *     3. `"slider-without-filters"` is the same as `"slider"` but does also not render any sorting or filter buttons
   * @default "grid"
   */
  layout?: PossibleLayout;
}

/**
 * The listing to query Depict for. `type` can be `"listingId"` or `"externalId"`..
 * If `id` is `"listingId"`, it should be a uuid where Depict is the source of truth, you can get them here: https://api.depict.ai/docs#tag/Listing/operation/Get_Listings_v3_listings_get.
 * If `id` is `"externalId"`, it should be the id of the product listing in your system - whatever was passed to Depict during data ingestion.
 */
export type ListingQuery = {
  type: typeof IdTypes.LISTING_ID | typeof IdTypes.EXTERNAL_ID;
  id: string;
};
