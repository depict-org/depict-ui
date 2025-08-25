//"use client"; // <- opt out of react server components to the rendering method where components are rendered both on the client and on the server and then hydrated on the client, see https://www.joshwcomeau.com/react/server-components/#:~:text=Client%20Components%20render%20on%20both%20the%20client%20and%20the%20server.
// This "use client" actually just gets deleted by parcel, but I'm leaving it because we re-add it in the build scripts and this makes you more aware of that
// Doing that freaks react out, one can only have one use client statement: https://depictaiworkspace.slack.com/archives/C02BASM9X5J/p1699972968084709 but leaving it here commented out for you rinformation regardless
import { createElement } from "react";
import { ImagePlaceholder as SolidImagePlaceholder, TextPlaceholder as SolidTextPlaceholder } from "@depict-ai/ui";
import { Display } from "@depict-ai/utilishared";
import { UseSearchModalReturn } from "../src/ui/hooks/useSearchModal/useSearchModal.types";
import { UseSearchFieldReturn } from "../src/ui/hooks/useSearchField/useSearchField.types";
import { UsePerformanceClientReturn } from "../src/ui/hooks/usePerformanceClient/usePerformanceClient.types";
import { UseFetchRecommendationsReturn } from "../src/ui/hooks/useFetchRecommendations/useFetchRecommendations.types";
import { server_wrap_solid_in_react } from "./server_wrap_solid_in_react";
import { validate_recommendations_options } from "./validate_recommendations_options";
import { SolidRecommendationGridWrapper } from "../src/ui/components/SolidRecommendationGridWrapper";
export { CategoryTitle, embedded_num_products as EmbeddedNumProducts } from "@depict-ai/ui";

// This is the server export of your React stuff
// The purpose of this, is to not break anything when running on Node (like with Next.js)
// You should avoid using any compiled SolidJS here (use a function that exports an empty string instead)
// Also note, anything React related should be the same. Otherwise, Next.js will complain that the render tree changed.
export function DepictProvider(props) {
  return props.children;
}

export function useCategoryFilterHelpers() {
  const noop = () => {};
  return {
    categorySetShouldShowFilters: noop,
    categorySetFilter: noop,
    categoryExpandFilterGroup: noop,
  };
}

export function SearchPage() {
  return createElement("div", {
    children: [],
  });
}

export function CategoryPage() {
  return createElement("div", {
    children: [],
  });
}

export function BreadCrumbs() {
  return createElement("div", {
    children: [],
  });
}

export function LooksSliderOrGrid() {
  return createElement("div", {
    children: [],
  });
}

export function QuickLinks() {
  return createElement("div", {
    children: [],
  });
}

export function RecommendationSlider(props) {
  validate_recommendations_options(props);
  return createElement("div", {
    children: [],
  });
}

export function ComponentAligner() {
  return createElement("div", { className: "depict aligner", style: { height: "100%" } });
}

export function ImagePlaceholder(raw_react_props: Parameters<typeof SolidImagePlaceholder>[0] & { className: string }) {
  const react_props = { class: raw_react_props.className, ...raw_react_props };
  return server_wrap_solid_in_react({
    solid_component: props_store => SolidImagePlaceholder(props_store),
    props: react_props,
    wrapper_type: "span",
  });
}

export function RecommendationGrid<T extends Display>(props: Parameters<typeof SolidRecommendationGridWrapper<T>>[0]) {
  validate_recommendations_options(props);
  return server_wrap_solid_in_react({
    solid_component: SolidRecommendationGridWrapper<T>,
    props,
    wrapper_type: "section",
  });
}

export function TextPlaceholder(
  raw_react_props: Omit<Parameters<typeof SolidTextPlaceholder>[0], "class"> & { className: string }
) {
  const react_props = { ...raw_react_props, class: raw_react_props.className };
  return server_wrap_solid_in_react({
    solid_component: props_store => SolidTextPlaceholder(props_store),
    props: react_props,
    wrapper_type: "span",
    wrapper_style: {
      "height": "100%",
    },
  });
}

export function useSearchField(): UseSearchFieldReturn {
  return {
    SearchField: () =>
      createElement("div", {
        children: [],
      }),
  };
}

export function openModal() {}

export function useSearchModal(): UseSearchModalReturn {
  return {
    open: () => {},
  };
}

export function usePerformanceClient(): UsePerformanceClientReturn {
  const mock = {
    get: function (target, property) {
      if (typeof target[property] === "undefined") {
        return () => {
          throw new Error(
            "Depict Performance Client is currently not available on the server. Please wrap your call in a useEffect hook or user event handler."
          );
        };
      }

      return target[property];
    },
  };

  return {
    dpc: new Proxy({}, mock),
  };
}

export function useFetchRecommendations<T extends Display>(): UseFetchRecommendationsReturn<T> {
  return {
    fetchRecommendations: () => {
      throw new Error(
        "fetchRecommendations is currently not available on the server due to personalisation/session_id related issues. Please only call it on the client."
      );
    },
  };
}

export { version } from "../src/version";
