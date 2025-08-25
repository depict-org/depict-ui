import { ListingProvider, LookCard, PseudoRouter } from "@depict-ai/ui/latest";
import { wrap_solid_in_react } from "../utils/wrap_solid_in_react";
import { createSignal } from "solid-js";
import { FeaturedInDisplay } from "@depict-ai/types/api/FeaturedInResponseV3";

export function ReactLookCard(react_props: { display_: FeaturedInDisplay | null }) {
  return wrap_solid_in_react({
    solid_component: props_store =>
      ListingProvider({
        // Wrap in ListingProvider so autoAdjustAspectRatio works as it should (I think)
        get children() {
          const animationDuration = 240;
          const signal = createSignal<Set<symbol>>(new Set());
          const pseudoRouter = new PseudoRouter("hard_navigation");

          return LookCard({
            display_: () => props_store.display_,
            animationDuration_: animationDuration,
            expandedLooksSignal_: signal,
            placeholderImageAspectRatio_: 0.75,
            priceFormatting_: () => ({
              pre_: "",
              post_: "",
              decimal_places_delimiter_: ".",
              thousands_delimiter_: " ",
              places_after_comma_: 0,
            }),
            pseudoRouter_: pseudoRouter,
          });
        },
      }),
    props: react_props,
    className: "depict",
    wrapper_style: {
      // @ts-expect-error
      "--animation-duration": "240ms",
    },
  });
}
