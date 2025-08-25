// @ts-nocheck
import { DisplayTransformers } from "@depict-ai/react-ui/latest";

export const displayTransformers: DisplayTransformers<any, any> = {
  products: ({ displays }) =>
    displays.map(display => {
      if (!("variant_index" in display)) {
        display.page_url ||= "/fake-url"; // IDK what this is good for
        return display;
      }
      return {
        ...display,
        variant_displays: display.variant_displays.map((variant_display: any) => ({
          page_url: "/fake-url",
          ...variant_display,
        })),
      };
    }),
  categories: ({ data, market }) =>
    data.map((categoryDisplay) => {
      const url_object = new URL(location.href);
      url_object.pathname = `/${market}/category/${categoryDisplay.listing_id}`;
      return { ...categoryDisplay, page_url: url_object.href };
    }),
};
