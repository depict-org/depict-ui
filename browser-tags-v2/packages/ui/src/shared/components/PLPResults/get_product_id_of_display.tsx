import { Display } from "@depict-ai/utilishared";
import { FeaturedInDisplay } from "@depict-ai/types/api/FeaturedInResponseV3";

/**
 * Gets product_id (the thing we key the rendering on) from a display
 */
export function get_product_id_of_display<T extends Display | FeaturedInDisplay>(display: T) {
  if ("variant_index" in display) {
    const actual_display = display.variant_displays[display.variant_index];
    return actual_display.product_id as string;
  }
  if ("listing_id" in display) {
    return display.listing_id;
  }
  return display.product_id;
}
