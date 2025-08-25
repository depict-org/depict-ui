import { is_category_page, is_search_page } from "../util";

export const defaultNavigation = (relativeUrl: string, isReplace: boolean, scroll: boolean) => {
  if (typeof (window as any)?.next?.router === "undefined") {
    throw new Error("You must provide a navigateFunction when not using Next.js.");
  }
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

  (window as any).next.router[isReplace ? "replace" : "push"](relativeUrl, undefined, {
    shallow: current_page === target_page && target_page !== Page.OTHER, // Can't go shallowly to other pages
    scroll,
  });
};
