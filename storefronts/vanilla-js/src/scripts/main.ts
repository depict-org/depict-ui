import { sv } from "@depict-ai/js-ui/locales";
import setupCategoryListing from "./category";
import setupRecommendations from "./recommendations";
import setupSearch from "./search";
import { runDPCTest } from "./tracking";
import { onExistsObserver } from "@depict-ai/js-ui";

export const market = "com-eur";
export const merchant = "equestrian";
export const backendLocale = "en";
export const locale = {
  ...sv,
  price_formatting_: {
    pre_: "",
    post_: " kr",
    decimal_places_delimiter_: ",",
    thousands_delimiter_: " ",
    places_after_comma_: "auto" as const,
  } as const,
  backend_locale_: backendLocale,
};

// @ts-ignore
window.TEST_DPC = runDPCTest;
setupSearch();
setupCategoryListing();
setupRecommendations();

onExistsObserver("[data-href]", element => {
  element.setAttribute("href", element.dataset.href!);
});
