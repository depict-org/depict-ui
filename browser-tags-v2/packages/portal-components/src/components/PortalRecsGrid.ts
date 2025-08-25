import { ModernDisplay, standard_price_format } from "@depict-ai/utilishared/latest";
import {
  BaseProductListingConfig,
  defaultColsAtSize,
  defaultGridSpacing,
  RecommendationGrid as SDKRecommendationGrid,
} from "@depict-ai/ui/latest";
import { wrap_solid_in_react } from "../utils/wrap_solid_in_react";
import { DefaultSolidProductCard, ProductCardSchema } from "../specialForShopify/DefaultSolidProductCard";
import { defaultProductCardConfig } from "./ReactDefaultProductCard";

export interface PortalRecsConfig<T extends ModernDisplay> extends BaseProductListingConfig {
  /**
   * A promise containing the recommendations to render, see https://docs.depict.ai/api-guide/recommendations/api-client/fetching
   */
  recommendations: Promise<T[]>;

  /**
   * Title to show when recommendations are being shown
   */
  title?: string;

  /**
   * Config to use for the product card
   */
  productCardConfig?: ProductCardSchema | null;
}

export interface PortalRecommendationGridConfig<T extends ModernDisplay> extends PortalRecsConfig<T> {
  maxRows?: number;
  viewMoreButton?: {
    text: string;
    startRows?: number;
    rowsPerClick?: number;
  };
}

/**
 * Copy-pasted RecommendationGrid from react-ui that's hardcoded to render the default product card
 * By not wrapping the default product card in a react component again we get working placeholder (react's rendering delay otherwise makes them not show sometimes) and working <ListingContext> and therefore videos, correctly dosed sizes. etc
 */
export function PortalRecsGrid<T extends ModernDisplay>(props: Parameters<typeof SolidWrapper<T>>[0]) {
  return wrap_solid_in_react({
    solid_component: SolidWrapper,
    props,
    wrapper_type: "section",
  });
}

export function SolidWrapper<T extends ModernDisplay>(props: PortalRecommendationGridConfig<T>) {
  return SDKRecommendationGrid({
    get recommendations() {
      return props.recommendations;
    },
    product_card_template: (display, info) => {
      return DefaultSolidProductCard(
        () => display,
        info && {
          ...info,
          formatPrice: <T extends number | undefined>(price: T) =>
            (price && standard_price_format(price)) as T extends undefined ? undefined : string,
        },
        () => props.productCardConfig || defaultProductCardConfig
      );
    },
    get cols_at_size() {
      return props.columnsAtSize || defaultColsAtSize;
    },
    get grid_spacing() {
      return props.gridSpacing ?? defaultGridSpacing;
    },
    get max_rows() {
      return props.maxRows;
    },
    get title() {
      return props.title;
    },
    get view_more_button() {
      const { viewMoreButton } = props;
      return viewMoreButton
        ? {
            text: viewMoreButton.text,
            start_rows: viewMoreButton.startRows ?? 2,
            rows_per_click: viewMoreButton.rowsPerClick,
          }
        : undefined;
    },
  });
}
