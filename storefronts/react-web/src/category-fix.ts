import { DisplayTransformers } from "@depict-ai/react-ui";

export const displayTransformers: DisplayTransformers<any, any> = {
  categories: ({ data }) =>
    data.map((categoryDisplay) => {
      const url_object = new URL(location.href);
      url_object.pathname = "/category";
      url_object.searchParams.set("id", categoryDisplay.listing_id!);
      return { ...categoryDisplay, page_url: url_object.href };
    }),
};
