import { Display } from "@depict-ai/utilishared";
import { wrap_solid_in_react } from "../../util";
import { SolidRecommendationGridWrapper } from "./SolidRecommendationGridWrapper";
import { hydrate } from "solid-js/web";
import { validate_recommendations_options } from "../../../src-server/validate_recommendations_options";

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
export function RecommendationGrid<T extends Display>(props: Parameters<typeof SolidRecommendationGridWrapper<T>>[0]) {
  validate_recommendations_options(props);
  return wrap_solid_in_react({
    solid_component: SolidRecommendationGridWrapper<T>,
    props,
    hydrate_function_when_ssr: hydrate,
    wrapper_type: "section",
  });
}
