import { Display } from "@depict-ai/utilishared";
import { wrap_solid_in_react } from "../../util";
import { RecommendationConfig } from "./SolidRecommendationGridWrapper";
import { render_display_or_block_from_react_template } from "../../helpers/render_display_or_block_from_react_template";
import { defaultColsAtSize, defaultGridSpacing, RecommendationSlider as SDKRecommendationSlider } from "@depict-ai/ui";
import { ReactPortal } from "react";
import { validate_recommendations_options } from "../../../src-server/validate_recommendations_options";

interface RecommendationSliderConfig<T extends Display> extends RecommendationConfig<T> {}

/**
 * Renders a slider of the provided products
 * @param recommendations a promise resolving to an array of displays to render
 * @param productCard a function that renders a product card or a placeholder for one
 * @param columnsAtSize the number of columns to show at each media breakpoint
 * @param gridSpacing the spacing between the product cards
 * @param title Optional title to show when recommendations are being shown
 */
export function RecommendationSlider<T extends Display>(
  props: Parameters<typeof SolidRecommendationSliderWrapper<T>>[0]
) {
  validate_recommendations_options(props);
  return wrap_solid_in_react({
    solid_component: SolidRecommendationSliderWrapper<T>,
    props,
  });
}

export function SolidRecommendationSliderWrapper<T extends Display>(
  props: RecommendationSliderConfig<T>,
  set_portals: (portals: ReactPortal[]) => void
) {
  const component_portals = new Set<ReactPortal>();

  return SDKRecommendationSlider<T>({
    get recommendations() {
      return props.recommendations;
    },
    product_card_template: (display, info) =>
      render_display_or_block_from_react_template({
        component_props: { display },
        get_react_template: () => props.productCard,
        component_portals,
        set_portals,
        set_on_index_change_: info?.set_on_index_change,
      }),
    get cols_at_size() {
      return props.columnsAtSize || defaultColsAtSize;
    },
    get grid_spacing() {
      return props.gridSpacing ?? defaultGridSpacing;
    },
    get title() {
      return props.title;
    },
  });
}
