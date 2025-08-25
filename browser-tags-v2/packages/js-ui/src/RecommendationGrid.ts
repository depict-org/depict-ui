import { defaultColsAtSize, defaultGridSpacing, RecommendationGrid as SDKRecommendationGrid } from "@depict-ai/ui";
import { Display } from "@depict-ai/utilishared";
import { RecommendationRenderingConfig } from "./types";

export interface RecommendationGridConfig<T extends Display> extends RecommendationRenderingConfig<T> {
  viewMoreButton?: {
    text: string;
    startRows?: number;
    rowsPerClick?: number;
  };
  maxRows?: number;
}

/**
 * Renders a product grid of the provided products
 * @param recommendations a promise resolving to an array of displays to render
 * @param productCard a function that renders a product card or a placeholder for one
 * @param columnsAtSize the number of columns to show at each media breakpoint
 * @param gridSpacing the spacing between the product cards
 * @param maxRows the maximum number of rows to show.
 * @param viewMoreButton optional configuration for the view more button. If unset, all products will be shown by default. Otherwise, a view more button with the given text will be shown. With the properties startRows and rowsPerClick, you can configure how many rows should be shown initially and how many rows should be added on each click.
 * @param title Optional title to show when recommendations are being shown
 */
export function RecommendationGrid<T extends Display>({
  recommendations,
  productCard,
  columnsAtSize,
  gridSpacing,
  viewMoreButton,
  maxRows,
  title,
}: RecommendationGridConfig<T>): HTMLElement {
  return SDKRecommendationGrid({
    recommendations,
    max_rows: maxRows,
    product_card_template: productCard,
    cols_at_size: columnsAtSize || defaultColsAtSize,
    grid_spacing: gridSpacing ?? defaultGridSpacing,
    title,
    view_more_button: viewMoreButton
      ? {
          text: viewMoreButton.text,
          start_rows: viewMoreButton.startRows ?? 2,
          rows_per_click: viewMoreButton.rowsPerClick,
        }
      : undefined,
  });
}
