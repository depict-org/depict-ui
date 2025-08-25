import { defaultColsAtSize, defaultGridSpacing, RecommendationSlider as SDKRecommendationSlider } from "@depict-ai/ui";
import { Display } from "@depict-ai/utilishared";
import { RecommendationRenderingConfig } from "./types";

interface SliderConfig<T extends Display> extends RecommendationRenderingConfig<T> {}

/**
 * Renders a slider of the provided products
 * @param recommendations a promise resolving to an array of displays to render
 * @param productCard a function that renders a product card or a placeholder for one
 * @param columnsAtSize the number of columns to show at each media breakpoint
 * @param gridSpacing the spacing between the product cards
 * @param title Optional title to show when recommendations are being shown
 */
export function RecommendationSlider<T extends Display>({
  recommendations,
  productCard,
  columnsAtSize,
  gridSpacing,
  title,
}: SliderConfig<T>): HTMLElement {
  return SDKRecommendationSlider({
    recommendations,
    product_card_template: productCard,
    grid_spacing: gridSpacing ?? defaultGridSpacing,
    cols_at_size: columnsAtSize || defaultColsAtSize,
    title,
  });
}
