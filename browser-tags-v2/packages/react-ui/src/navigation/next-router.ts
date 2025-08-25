import type { NextRouter } from "next/router";
import { is_category_page, is_search_page } from "../util";
import { NavigateFunction } from "../ui/components/DepictProvider";

/**
 * Helper function that creates a function that can be used as the
 * navigateFunction callback for DepictProvider when using next.js.
 * @param router the NextRouter object return from useRouter() when using next.js
 * @returns a function that can be used as the navigateFunction callback for DepictProvider when using next.js
 */
export const nextRouterNavigation =
  (router: NextRouter): NavigateFunction =>
  (relativeUrl, { scroll, replace }) => {
    const enum Page {
      OTHER,
      SEARCH,
      CATEGORY,
    }
    const current_page = is_search_page() ? Page.SEARCH : is_category_page() ? Page.CATEGORY : Page.OTHER;
    const target_u_o = new URL(relativeUrl, location.origin);
    const target_page = is_search_page(target_u_o)
      ? Page.SEARCH
      : is_category_page(target_u_o)
      ? Page.CATEGORY
      : Page.OTHER;

    router[replace ? "replace" : "push"](relativeUrl, undefined, {
      shallow: current_page === target_page && target_page !== Page.OTHER, // Can't go shallowly to other pages
      scroll,
    });
  };
