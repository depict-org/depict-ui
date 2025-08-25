/** @jsxImportSource solid-js */
import { Display } from "@depict-ai/utilishared";
import { ProductCardTemplate, SDKGridSpacing } from "../shared/types";
import { createMemo, createResource, JSX as solid_JSX } from "solid-js";
import {
  convert_sdk_cols_at_size_to_layout,
  SDKColsAtSize,
} from "../shared/helper_functions/cols_at_size_transformer/cols_at_size_transformer";
import { SolidRecommendationSlider } from "../shared/components/SolidRecommendationSlider";
import { run_in_root_or_auto_cleanup } from "../shared/helper_functions/run_in_root_or_auto_cleanup";
import { ListingProvider } from "../shared/helper_functions/ListingContext";

/**
 * Render a grid with provided recommendations. displayTransformers will not be applied for this since you yourself provide the displays. Options are reactive.
 */
export function SDKRecommendationSlider<T extends Display>(props: {
  grid_spacing: SDKGridSpacing;
  cols_at_size: SDKColsAtSize;
  recommendations: Promise<T[]>;
  title?: solid_JSX.Element;
  product_card_template: ProductCardTemplate<T>;
  showSliderArrow_?: boolean;
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
      <div class={`depict recommendations${props.class ? ` ${props.class}` : ""}`}>
        <ListingProvider>
          {SolidRecommendationSlider({
            product_card_template_: (...args) => props.product_card_template(...args),
            recommendations_resource_,
            showSliderArrow_: () => props.showSliderArrow_,
            title_: () => props.title,
            layout_options_: createMemo(() => ({
              cols_at_size: convert_sdk_cols_at_size_to_layout(props.cols_at_size),
              ...grid_spacing_override(),
            })),
          })}
        </ListingProvider>
      </div>
    ) as HTMLDivElement;
  }, "RecommendationSlider failed");
}
