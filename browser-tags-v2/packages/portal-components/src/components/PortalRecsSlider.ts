import { ModernDisplay, standard_price_format } from "@depict-ai/utilishared/latest";
import {
  defaultColsAtSize,
  defaultGridSpacing,
  RecommendationSlider as SDKRecommendationSlider,
} from "@depict-ai/ui/latest";
import { wrap_solid_in_react } from "../utils/wrap_solid_in_react";
import { DefaultSolidProductCard } from "../specialForShopify/DefaultSolidProductCard";
import { PortalRecsConfig } from "./PortalRecsGrid";
import { defaultProductCardConfig } from "./ReactDefaultProductCard";

interface PortalRecsSliderConfig<T extends ModernDisplay> extends PortalRecsConfig<T> {
  showSliderArrow: boolean;
}

/**
 * Copy-pasted RecommendationGrid from react-ui that's hardcoded to render the default product card
 * By not wrapping the default product card in a react component again we get working placeholder (react's rendering delay otherwise makes them not show sometimes) and working <ListingContext> and therefore videos, correctly dosed sizes. etc
 */
export function PortalRecsSlider<T extends ModernDisplay>(props: Parameters<typeof SolidWrapper<T>>[0]) {
  return wrap_solid_in_react({
    solid_component: SolidWrapper,
    props,
    wrapper_type: "section",
  });
}

function SolidWrapper<T extends ModernDisplay>(props: PortalRecsSliderConfig<T>) {
  return SDKRecommendationSlider({
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
    get title() {
      return props.title;
    },
    get showSliderArrow_() {
      return props.showSliderArrow;
    },
  });
}
