/** @jsxImportSource solid-js */
import { SolidRecommendationGrid } from "../shared/components/SolidRecommendationGrid";
import { Display } from "@depict-ai/utilishared";
import { ProductCardTemplate, SDKGridSpacing } from "../shared/types";
import { createMemo, createResource, JSX as solid_JSX } from "solid-js";
import {
  convert_sdk_cols_at_size_to_layout,
  SDKColsAtSize,
} from "../shared/helper_functions/cols_at_size_transformer/cols_at_size_transformer";
import { run_in_root_or_auto_cleanup } from "../shared/helper_functions/run_in_root_or_auto_cleanup";
import { ListingProvider } from "../shared/helper_functions/ListingContext";

/**
 * Render a grid with provided recommendations. displayTransformers will not be applied for this since you yourself provide the displays. Options are reactive.
 * If no merchant or market is specified, the product cards won't get any merchant and market in their second argument.
 */
export function SDKRecommendationGrid<T extends Display>(props: {
  grid_spacing: SDKGridSpacing;
  cols_at_size: SDKColsAtSize;
  title?: solid_JSX.Element;
  recommendations: Promise<T[]>;
  view_more_button?: {
    text: string;
    start_rows?: number;
    rows_per_click?: number;
  };
  max_rows?: number;
  product_card_template: ProductCardTemplate<T>;
  class?: string;
}): HTMLDivElement {
  return run_in_root_or_auto_cleanup(() => {
    const grid_spacing_override = createMemo(() => {
      const { grid_spacing } = props; // can be reactive
      return typeof grid_spacing === "string"
        ? { grid_spacing }
        : { override_vertical_spacing: grid_spacing.vertical, grid_spacing: grid_spacing.horizontal };
    });

    const [recommendations_resource_] = createResource(
      () => props.recommendations,
      recs => recs
    );

    return (
      <div class={`depict plp recommendations${props.class ? ` ${props.class}` : ""}`}>
        <ListingProvider>
          {SolidRecommendationGrid({
            max_rows_: () => props.max_rows,
            view_more_button_: () => props.view_more_button,
            product_card_template_: (...args) => props.product_card_template(...args),
            recommendations_resource_,
            title_: () => props.title,
            layout_options_: createMemo(() => ({
              cols_at_size: convert_sdk_cols_at_size_to_layout(props.cols_at_size),
              ...grid_spacing_override(),
            })),
          })}
        </ListingProvider>
      </div>
    ) as HTMLDivElement;
  }, "RecommendationGrid failed");
}
