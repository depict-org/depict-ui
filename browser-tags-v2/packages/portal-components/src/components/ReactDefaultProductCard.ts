import { ModernDisplayWithPageUrl } from "@depict-ai/ui/latest";
import { wrap_solid_in_react } from "../utils/wrap_solid_in_react";
import { DefaultSolidProductCard, ProductCardSchema } from "../specialForShopify/DefaultSolidProductCard";
import { standard_price_format } from "@depict-ai/utilishared/latest";

export function ReactDefaultProductCard(react_props: {
  options?: ProductCardSchema;
  display: null | ModernDisplayWithPageUrl<any>;
}) {
  return wrap_solid_in_react({
    solid_component: props_store => {
      return DefaultSolidProductCard(
        () => props_store.display,
        {
          set_on_index_change: () => {},
          formatPrice: <T extends number | undefined>(price: T) =>
            (price && standard_price_format(price)) as T extends undefined ? undefined : string,
        },
        () => ({ ...(props_store?.options || defaultProductCardConfig), forceIsVisible_: true })
      );
    },
    // Work around in case https://github.com/solidjs/solid/issues/2139 potentially arises
    props: structuredClone(react_props),
    className: "depict",
  });
}

export const defaultProductCardConfig: ProductCardSchema = {
  image_radius: "md",
  alignment: "left",
  sizes: true,
  smart_labels: {
    font_size_rem: 1,
    enabled: true,
    bold: false,
    italic: false,
    color: "#0f0f0f",
  },
  title: {
    font_size_rem: 1,
    enabled: true,
    bold: false,
    italic: false,
    color: "#0f0f0f",
  },
  price: {
    font_size_rem: 1,
    enabled: true,
    bold: false,
    italic: false,
    color: "#0f0f0f",
  },
  original_price: {
    font_size_rem: 1,
    enabled: true,
    bold: false,
    italic: false,
    color: "#0f0f0f",
  },
  use_hover_image: true,
  image_carousel: true,
  color_options: true,
  image_aspect_ratio: 1,
  is_ejected: false,
};
