import { sv } from "@depict-ai/js-ui/locales";
import setupCategoryListing from "./category";
import setupRecommendations from "./recommendations";
import setupSearch from "./search";
import setupTrackingTest from "./tracking";
import { onExistsObserver } from "@depict-ai/js-ui";

export const market = "se";
export const merchant = "equestrian";
export const locale = {
  ...sv,
  price_formatting_: {
    pre_: "",
    post_: " kr",
    decimal_places_delimiter_: ",",
    thousands_delimiter_: " ",
    places_after_comma_: "auto" as const,
  } as const,
};

setupTrackingTest();
setupSearch();
setupCategoryListing();
setupRecommendations();

onExistsObserver("[data-href]", element => {
  element.setAttribute("href", element.dataset.href!);
});
