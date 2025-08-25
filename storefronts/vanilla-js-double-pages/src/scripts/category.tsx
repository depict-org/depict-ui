import {
  CategoryPage,
  DepictCategoryProvider,
  SetupPageReplacer,
  onExistsObserver,
  BreadCrumbs,
} from "@depict-ai/js-ui";
import { StrongerDisplay } from "./display";
import { locale, market, merchant } from "./main";
import { productCard } from "./productCard";
import { createSignal, onCleanup } from "solid-js";
import { instant_exec_on_suspect_history_change } from "../../../../browser-tags-v2/packages/utilishared";
import {defaultColsAtSize} from "./defaults";

export default function setupCategoryListing() {
  const categoryId = location.pathname == "/category.html" && new URL(document.location.href).searchParams.get("id");
  const categoryId2 = new URL(document.location.href).searchParams.get("id2");
  const [href, set_href] = createSignal(location.href);

  const categoryProvider = new DepictCategoryProvider<StrongerDisplay>({
    market,
    merchant,
    locale,
    categoryId: categoryId || undefined,
    userId: "vanilla-js-user-1234",
    sessionId: "vanilla-js-session-1234",
    pageURLCreator: opts => {
      const { market } = opts;
      if (opts.type === "categories") {
        return opts.data.map(({ query_id }) => {
          return {
            get page_url() {
              const u_o = new URL("/category.html", location.origin);
              const { searchParams } = u_o;
              const old_other_id = new URL(href()).searchParams.get("id2")!;
              if (old_other_id) {
                searchParams.set("id2", old_other_id);
              }
              searchParams.set("id", query_id!);
              return u_o.href;
            },
          };
        });
      }
      return opts.displays.map(display => ({ page_url: "/fake_url" }));
    },
  });

  const categoryProvider2 = new DepictCategoryProvider<StrongerDisplay>({
    market,
    merchant,
    locale,
    categoryId: categoryId2 || categoryId || undefined,
    userId: "vanilla-js-user-1234",
    sessionId: "vanilla-js-session-1234",
    uniqueInstanceKeyForState: "1",
    pageURLCreator: opts => {
      const { market } = opts;
      if (opts.type === "categories") {
        return opts.data.map(({ query_id }) => {
          return {
            get page_url() {
              const u_o = new URL("/category.html", location.origin);
              const { searchParams } = u_o;
              const old_other_id = new URL(href()).searchParams.get("id")!;
              if (old_other_id) {
                searchParams.set("id", old_other_id);
              }
              searchParams.set("id2", query_id!);
              return u_o.href;
            },
          };
        });
      }
      return opts.displays.map(display => ({ page_url: "/fake_url" }));
    },
  });

  SetupPageReplacer({
    isPageToReplace: url => url.pathname == "/category.html" || url.pathname.startsWith("/sv"),
    selectorToReplace: `.replace-for-depict`,
    renderContent: () => {
      const handler = () => set_href(location.href);
      instant_exec_on_suspect_history_change.add(handler);
      onCleanup(() => instant_exec_on_suspect_history_change.delete(handler));

      return (
        <div class="double-listings">
          {CategoryPage({
            categoryProvider,
            productCard,
            columnsAtSize: defaultColsAtSize
          })}
          {CategoryPage({
            columnsAtSize: defaultColsAtSize,
            categoryProvider: categoryProvider2,
            productCard,
          })}
        </div>
      );
    },
  });

  onExistsObserver("body", element => element.prepend(BreadCrumbs({ categoryProvider })));

  // Make category page links IN PAGE HEADER single page navigate when clicked
  onExistsObserver<HTMLAnchorElement>(".categories a[data-category-id]", element => {
    element.href = "javascript:void(0)";
    element.addEventListener("click", () => {
      const new_id = element.dataset.categoryId!;
      history.pushState({ ...history.state }, "", "/category.html?id=" + new_id);
      categoryProvider.categoryId = new_id;
      categoryProvider2.categoryId = new_id;
    });
  });
}
