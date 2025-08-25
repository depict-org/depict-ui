import {
  CategoryPage,
  DepictCategoryProvider,
  SetupPageReplacer,
  onExistsObserver,
  BreadCrumbs,
  contentBlockStore,
} from "@depict-ai/js-ui";
import { StrongerDisplay } from "./display";
import { locale, market, merchant } from "./main";
import { productCard } from "./productCard";

export default function setupCategoryListing() {
  const categoryId = location.pathname == "/category.html" && new URL(document.location.href).searchParams.get("id");
  const BLOCK1 = () => {
    return <div style="background:green">I'm da first content block {Math.random()}</div>;
  };
  const BLOCK2 = () => {
    return <div style="background:red">I'm da second content block {Math.random()}</div>;
  };
  const BLOCK3 = () => {
    return <div style="background:yellow">I'm the second content block {Math.random()}</div>;
  };

  const { getContentBlocksByRow, setContentBlocksByRow } = contentBlockStore([
    ,
    ,
    {
      spanColumns: 2,
      spanRows: 2,
      position: "center" as const,
      content: BLOCK2,
    },
    {
      spanColumns: 1,
      spanRows: 2,
      position: "right" as const,
      content: BLOCK3,
    },
  ]);

  const addBlock = () => {
    const stuff = getContentBlocksByRow();
    (stuff[0] = {
      spanColumns: 1,
      spanRows: 3,
      position: "left" as const,
      content: BLOCK1,
    }),
      setContentBlocksByRow(stuff);
  };

  setInterval(() => {
    addBlock();
    setTimeout(
      () =>
        setContentBlocksByRow(prev => {
          delete prev[0];
          return prev;
        }),
      1000
    );
  }, 2000);

  const categoryProvider = new DepictCategoryProvider<StrongerDisplay>({
    market,
    merchant,
    locale,
    listingQuery: {id: categoryId || "", type: "listingId"},
    sessionId: "vanilla-js-session-1234",
    displayTransformers: {
      categories: ({ data }) =>
        data.map(categoryDisplay => {
          const u_o = new URL("/category.html", location.origin);
          u_o.searchParams.set("id", categoryDisplay.listing_id!);
          return { ...categoryDisplay, page_url: u_o.href };
        }),
    },
  });

  SetupPageReplacer({
    isPageToReplace: url => url.pathname == "/category.html" || url.pathname.startsWith("/sv"),
    selectorToReplace: `.replace-for-depict`,
    renderContent: () =>
      CategoryPage({
        categoryProvider,
        productCard,
        getContentBlocksByRow,
      }),
  });

  onExistsObserver("body", element => element.prepend(BreadCrumbs({ categoryProvider })));

  // Make category page links single page navigate when clicked
  onExistsObserver<HTMLAnchorElement>(".categories a[data-category-id]", element => {
    element.href = "javascript:void(0)";
    element.addEventListener("click", () => {
      const new_id = element.dataset.categoryId!;
      history.pushState({ ...history.state }, "", "/category.html?id=" + new_id);
      categoryProvider.listingQuery = {id: new_id, type: "listingId"};
    });
  });
}
