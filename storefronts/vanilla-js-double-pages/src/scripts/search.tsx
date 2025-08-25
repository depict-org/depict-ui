import { DepictSearchProvider, SearchField, SearchPage, SetupPageReplacer, onExistsObserver } from "@depict-ai/js-ui";
import { merchant, market, locale } from "./main";
import { StrongerDisplay } from "./display";
import { productCard } from "./productCard";
import {defaultColsAtSize} from "./defaults";

export default function setupSearch() {
  const searchProvider = new DepictSearchProvider<StrongerDisplay>({
    market,
    merchant,
    locale,
    searchPagePath: "/search.html",
    userId: "vanilla-js-user-1234",
    sessionId: "vanilla-js-session-1234",
    pageURLCreator: opts => {
      const { market } = opts;
      if (opts.type === "categories") {
        return opts.data.map(({ query_id }) => {
          const u_o = new URL("/category.html", location.origin);
          u_o.searchParams.set("id", query_id!);
          return { page_url: u_o.href };
        });
      }
      return opts.displays.map(display => ({ page_url: "/fake_url" }));
    },
  });
  const searchProvider2 = new DepictSearchProvider<StrongerDisplay>({
    market,
    merchant,
    locale,
    searchPagePath: "/search.html",
    userId: "vanilla-js-user-1234",
    sessionId: "vanilla-js-session-1234",
    uniqueInstanceKeyForState: "1",
    pageURLCreator: opts => {
      const { market } = opts;
      if (opts.type === "categories") {
        return opts.data.map(({ query_id }) => {
          const u_o = new URL("/category.html", location.origin);
          u_o.searchParams.set("id", query_id!);
          return { page_url: u_o.href };
        });
      }
      return opts.displays.map(display => ({ page_url: "/fake_url" }));
    },
  });

  // If search is open (pathname ends on /search.html) replace the content of the page with the search page
  // this is because we want to be able to "single page navigate"/ go really quickly to the search page and be able to go from search to search without reloading the page
  SetupPageReplacer({
    isPageToReplace: url => url.pathname == "/search.html",
    selectorToReplace: `.replace-for-depict`,
    renderContent: () => (
      <div class="double-listings">
        {SearchPage({
          searchProvider,
          includeInputField: false,
          productCard,
          columnsAtSize: defaultColsAtSize
        })}
        {SearchPage({
          searchProvider: searchProvider2,
          includeInputField: true,
          productCard,
          columnsAtSize: defaultColsAtSize
        })}
      </div>
    ),
  });

  // insert SearchField into .search-field-wrapper DOM element, once it shows up
  onExistsObserver(".search-field-wrapper", element => element.append(SearchField({ searchProvider })));

  onExistsObserver("#modal-centered", element => {
    element.addEventListener("click", () => {
      searchProvider.openModal();
    });
  });

  onExistsObserver("#modal-aligned", element => {
    element.addEventListener("click", () => {
      searchProvider.openModal(element);
    });
  });
}
