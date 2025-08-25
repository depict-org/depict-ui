/** @jsxImportSource solid-js */
import { base_url, dwarn, fetch_retry, ModernDisplay } from "@depict-ai/utilishared";
import { SDKGridSpacing } from "../shared/types";
import {
  Accessor,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  JSX,
  JSX as solid_JSX,
  mergeProps,
  Show,
  Signal,
} from "solid-js";
import {
  convert_sdk_cols_at_size_to_layout,
  SDKColsAtSize,
} from "../shared/helper_functions/cols_at_size_transformer/cols_at_size_transformer";
import { SolidRecommendationSlider } from "../shared/components/SolidRecommendationSlider";
import { run_in_root_or_auto_cleanup } from "../shared/helper_functions/run_in_root_or_auto_cleanup";
import { ListingProvider } from "../shared/helper_functions/ListingContext";
import { FeaturedInRequestV3 } from "@depict-ai/types/api/FeaturedInRequestV3";
import { FeaturedInDisplay, FeaturedInResponseV3 } from "@depict-ai/types/api/FeaturedInResponseV3";
import { LookCard } from "../shared/components/Looks/LookCard";
import { plp_shared_i18n } from "../locales";
import { DisplayTransformers, ModernDisplayWithPageUrl } from "../shared/display_transformer_types";
import { get_product_id_of_display } from "../shared/components/PLPResults/get_product_id_of_display";
import { OnNavigation, PseudoRouter } from "../shared/helper_functions/pseudo_router";
import { SolidRecommendationGrid } from "../shared/components/SolidRecommendationGrid";

let expandedLooksSignal_: Signal<Set<symbol>>;
const placeholderCacheKey_ = /*@__PURE__*/ Symbol("Looks");

/**
 * Render a grid with provided recommendations. displayTransformers will not be applied for this since you yourself provide the displays. Options are reactive.
 */
export function SDKLooksSliderOrGrid(props: {
  gridSpacing_: SDKGridSpacing;
  columnsAtSize_: SDKColsAtSize;
  productId_: string;
  merchant_: string;
  market_: string;
  locale_: string;
  imagePlaceholderAspectRatio_: number | string;
  title_?: solid_JSX.Element;
  class_?: string;
  FavoriteButton_?: (props: { display_: Accessor<ModernDisplay | null | undefined> }) => JSX.Element;
  NoResultsFallback_?: () => solid_JSX.Element;
  displayTransformers_?: DisplayTransformers<ModernDisplay, ModernDisplayWithPageUrl<ModernDisplay>>;
  /**
   * If provided, will render as grid instead of slider
   */
  gridOptions_?: {
    view_more_button?: {
      text: string;
      start_rows?: number;
      rows_per_click?: number;
    };
    max_rows?: number;
  };
  onNavigation_?: OnNavigation; // <- reactive
  priceFormatting_: plp_shared_i18n["price_formatting_"]; // <- reactive
}): HTMLDivElement {
  return run_in_root_or_auto_cleanup(() => {
    expandedLooksSignal_ ||= createSignal(new Set<symbol>(), { equals: false });
    const expandingAnimationDuration = 240;
    const pseudoRouter = new PseudoRouter("hard_navigation");
    const grid_spacing_override = createMemo(() => {
      const { gridSpacing_ } = props; // can be reactive
      return typeof gridSpacing_ === "string"
        ? { grid_spacing: gridSpacing_ }
        : { override_vertical_spacing: gridSpacing_.vertical, grid_spacing: gridSpacing_.horizontal };
    });

    const [looksResource] = createResource(
      () => [props.productId_, props.merchant_, props.market_, props.locale_],
      async ([product_id, merchant, market, locale]) => {
        const body: FeaturedInRequestV3 = {
          merchant,
          market,
          locale,
          product_id,
          "collection_type": "look",
        };

        const response = await fetch_retry(`${base_url}/v3/featured_in`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        const decoded = await (response as Response)?.json?.().catch(() => false);
        if (!decoded) {
          // If network fails, make sure to return empty array and SolidRecommendationSlider will remove its elements
          return [];
        }
        const { listings } = decoded as FeaturedInResponseV3;
        if (!listings) {
          // Sometimes backend returns a JSON containing an error instead, bail in that case
          return [];
        }
        const baseData = { merchant, market, locale };

        return runDisplayTransformersForLooks(baseData, listings, props.displayTransformers_);
      }
    );

    const sharedOptions = {
      product_card_template_: (display: FeaturedInDisplay | null) =>
        LookCard({
          display_: () => display,
          FavoriteButton_: props.FavoriteButton_,
          placeholderImageAspectRatio_: props.imagePlaceholderAspectRatio_,
          animationDuration_: expandingAnimationDuration,
          expandedLooksSignal_,
          priceFormatting_: () => props.priceFormatting_,
          pseudoRouter_: pseudoRouter,
        }),
      recommendations_resource_: looksResource,
      title_: () => props.title_,
      layout_options_: createMemo(() => ({
        cols_at_size: convert_sdk_cols_at_size_to_layout(props.columnsAtSize_),
        ...grid_spacing_override(),
      })),
      NoResultsFallback_: () => props.NoResultsFallback_ as unknown as JSX.Element,
      placeholderCacheKey_,
    } as const;

    createEffect(() => {
      const { onNavigation_ } = props;
      if (onNavigation_) {
        pseudoRouter.on_navigation_ = onNavigation_;
      }
    });

    return (
      <div
        class={`depict recommendations looks${props.class_ ? ` ${props.class_}` : ""}`}
        style={`--animation-duration: ${expandingAnimationDuration}ms`}
      >
        <ListingProvider>
          <Show when={props.gridOptions_} fallback={<SolidRecommendationSlider {...sharedOptions} />}>
            <SolidRecommendationGrid
              {...sharedOptions}
              view_more_button_={() => props.gridOptions_?.view_more_button}
              max_rows_={() => props.gridOptions_?.max_rows}
            />
          </Show>
        </ListingProvider>
      </div>
    ) as HTMLDivElement;
  }, "LookSlider failed");
}

async function runDisplayTransformersForLooks(
  baseData: { merchant: string; market: string; locale: string },
  listings: FeaturedInDisplay[],
  displayTransformers?: DisplayTransformers<ModernDisplay, ModernDisplayWithPageUrl<ModernDisplay>>
): Promise<FeaturedInDisplay[]> {
  try {
    const { products: productTransformer, categories: providedListingTransformer } = displayTransformers || {};
    if (!productTransformer && !providedListingTransformer) return listings;
    const listingTransformer =
      providedListingTransformer ||
      ((({ data }) => data) as NonNullable<
        DisplayTransformers<ModernDisplay, ModernDisplayWithPageUrl<ModernDisplay>>["categories"]
      >);
    const displaysToTransform: ModernDisplay[] = [];
    const displayIdsPerListingId: Record<string, string[]> = {};
    const transformedListingsPromise = listingTransformer({
      ...baseData,
      data: listings.map(({ displays, ...listing }) => {
        // Populate our displays by id and displayIdToListings object in the .map where we add ancestors to the listings, for peak efficiency
        for (let i = 0; i < displays.length; i++) {
          const display = displays[i];
          const uniqueIdOfDisplay = get_product_id_of_display(display as ModernDisplay);
          displaysToTransform.push(display);
          (displayIdsPerListingId[listing.listing_id] ||= []).push(uniqueIdOfDisplay);
        }
        return { ...listing, ancestors: [] };
      }),
    });
    // This allows the person providing the displayTransformer to re-order and remove displays
    const transformedProducts = productTransformer
      ? await productTransformer({ ...baseData, displays: displaysToTransform })
      : displaysToTransform;
    const transformedListings = await transformedListingsPromise;
    const transformedDisplayById: Record<string, ModernDisplay> = Object.fromEntries(
      transformedProducts.map(display => [get_product_id_of_display(display), display])
    );
    return transformedListings.map(listing =>
      mergeProps(listing, {
        // use mergeProps because in preview browser we add getters in this object, that would be called too early otherwise
        displays: (displayIdsPerListingId[listing.listing_id] || [])
          .map(displayId => transformedDisplayById[displayId])
          .filter(v => v),
      })
    );
  } catch (e) {
    dwarn("Displaytransformers threw", e);
    return [];
  }
}
