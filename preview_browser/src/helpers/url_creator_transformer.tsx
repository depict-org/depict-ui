import { DisplayTransformers } from "@depict-ai/ui/latest";
import { untrack } from "solid-js";
import { get_locale, get_market, get_merchant } from "~/helpers/url_state";
import { product_id_source_param_name } from "~/helpers/query_params";
import { get_instant_current_url_as_object } from "~/helpers/get_instant_current_url_as_object";

export const display_transformers: DisplayTransformers<any, any> = {
  products: ({ displays }) =>
    displays.map(display => {
      // Can't use Object.defineProperty on variant because spread doesn't read getters set with Object.defineProperty
      // This getter hack is only for the InstantResults in the search modal, the ProductCard duplicates this code for itself
      if (!display.variant_displays) {
        // Grandpastore for example, can't show product cards but don't want to crash
        return display;
      }
      return {
        ...display,
        variant_displays: display.variant_displays.map((variant: any) => ({
          // Add a function, which isn't clonable, to prevent render_displays from cloning our displays (which is to ensure caching works if we mutate them but we just don't mutate them)
          // We do this so the urls in the searchmodal can update reactively
          dont_clone: () => {},
          ...variant,
          original_page_url: variant.page_url,
          get page_url() {
            // Doing this a bunch of times shouldn't be harmful. We can't give the display transformers an owner, see https://gitlab.com/depict-ai/depict.ai/-/merge_requests/9199/diffs?commit_id=9dcb19cd52480fb292f3a1051c8c9c16a24d338e
            const u_o = get_instant_current_url_as_object()();
            const id_for_cart = variant?.product_id;
            const { searchParams } = u_o;
            searchParams.set(product_id_source_param_name, id_for_cart || "");
            u_o.pathname = `/${encodeURIComponent(get_merchant())}/${encodeURIComponent(
              get_market()
            )}/${encodeURIComponent(get_locale())}/${
              u_o.pathname.includes("looks-slider") ? "looks-slider" : "recommendations"
            }/`;
            return u_o.pathname + u_o.search + u_o.hash;
          },
        })),
      };
    }),
  categories: ({ data }) =>
    data.map(categoryDisplay => {
      return {
        ...categoryDisplay,
        get page_url() {
          // reactivity so, for example, show_listing_selector setting is preserved
          const u_o = get_instant_current_url_as_object()();
          u_o.searchParams.delete("query");
          u_o.pathname = `/${encodeURIComponent(untrack(get_merchant))}/${encodeURIComponent(
            untrack(get_market)
          )}/${encodeURIComponent(untrack(get_locale))}/listings/${encodeURIComponent(categoryDisplay.listing_id)}`;
          return u_o.href;
        },
      };
    }),
};
