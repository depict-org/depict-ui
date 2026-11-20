import { describe, expect, it } from "@jest/globals";
import { native_card_to_display } from "./cards";
import {
  ancestors_from_tree,
  browse_query_string,
  flat_query_string,
  native_browse_to_v3,
  native_listing_to_v3,
  native_suggest_to_v3,
  to_bcp47,
} from "./responses";
import type { BrowseResponse, ListingHeader, Product } from "./v4_types";

// The card is depictcentra's (the demo store's) native card for a v3 search it also serves, ids masked.
const card: Product = {
  group_id: "85",
  title: "Short-Sleeve Linen Shirt",
  brand: "Nordhem Studio",
  slug: "short-sleeve-linen-shirt",
  images: ["https://img/1.jpg", "https://img/2.jpg", "https://img/3.jpg"],
  in_stock: true,
  badges: [],
  price: { amount: 209 },
  variants: [
    {
      product_id: "73",
      sku: "NH-0086white",
      size: "XS",
      in_stock: true,
      attributes: { item_group_id: "NH-0086", transaction_product_id: "NH-0086white" },
    },
    {
      product_id: "74",
      sku: "NH-0086white",
      size: "S",
      in_stock: false,
      price: { amount: 150, compare_at: 209, lowest: 140 },
      image: "https://img/variant.jpg",
      attributes: { item_group_id: "NH-0086", transaction_product_id: "NH-0086white" },
    },
  ],
  selected: 0,
  attributes: { item_group_id: "NH-0086", transaction_product_id: "NH-0086white", color_hex: "d92531" },
  tracking_id: "d1.s.c303b8d9521947a79f32e64ff87608de.0.NzM",
};

describe("native_card_to_display", () => {
  it("serves v3's default display fields, the merchant attributes and the tracking id", () => {
    const display = native_card_to_display(card, "search_result_id");
    expect(display.variant_index).toBe(0);
    expect(display.search_result_id).toBe(card.tracking_id);
    expect(display.variant_displays[0]).toEqual({
      item_group_id: "NH-0086",
      transaction_product_id: "NH-0086white",
      color_hex: "#d92531",
      product_id: "73",
      main_product_id: "85",
      title: "Short-Sleeve Linen Shirt",
      image_urls: card.images,
      sale_price: 209,
      original_price: 209,
      in_stock: true,
      uri: "short-sleeve-linen-shirt",
    });
  });

  it("takes a variant's own price and image when it has them", () => {
    const variant = native_card_to_display(card, "product_listing_result_id").variant_displays[1];
    expect(variant).toMatchObject({
      product_id: "74",
      sale_price: 150,
      original_price: 209,
      lowest_price: 140,
      in_stock: false,
      image_urls: ["https://img/variant.jpg"],
    });
  });
});

describe("native_browse_to_v3", () => {
  const response: BrowseResponse = {
    request_id: "req-1",
    currency: "SEK",
    products: [card],
    total: 8,
    cursor: "abc",
    sorts: [{ field: "relevance", order: "desc", title: "Relevance", selected: true }],
    facets: [],
    content: [{ title: "Care", url: "/care" }],
  };

  it("answers as v3 search results, with no fallback notice", () => {
    expect(native_browse_to_v3(response, "search", 0)).toMatchObject({
      n_hits: 8,
      search_request_id: "req-1",
      cursor: "abc",
      is_fallback: null,
      content_search_links: [{ type: "content_link", title: "Care", page_url: "/care", highlights: [] }],
      sorts: [{ field: "_relevance", order: "desc" }],
      filters: [],
    });
  });

  it("answers as v3 listing products, with listing result ids", () => {
    const listing = native_browse_to_v3(response, "listing", 0);
    expect(listing).toMatchObject({ product_listing_request_id: "req-1", n_hits: 8 });
    expect(listing).not.toHaveProperty("search_request_id");
    expect((listing.displays as { product_listing_result_id: string }[])[0].product_listing_result_id).toBe(
      card.tracking_id
    );
  });

  it("counts what it has seen when V4 withholds the total", () => {
    expect(native_browse_to_v3({ ...response, total: undefined }, "search", 24).n_hits).toBe(25);
  });
});

describe("native_listing_to_v3", () => {
  const ref = (id: string, title: string) => ({ id, external_id: `ext-${id}`, title, slug: title.toLowerCase() });
  const header: ListingHeader = {
    ...ref("shirts", "Shirts"),
    type: "category",
    show_in_breadcrumbs: true,
    breadcrumbs: [ref("men", "Men")],
    quick_links: [ref("knitwear", "Knitwear"), ref("shirts", "Shirts")],
    images: ["https://img/l.jpg"],
    content_blocks: [],
  };

  it("serves breadcrumbs as ancestors and the quick links as siblings when the listing is among them", () => {
    const listing = native_listing_to_v3(header);
    expect(listing).toMatchObject({
      listing_id: "shirts",
      external_id: "ext-shirts",
      listing_type: "category",
      show_in_breadcrumbs: true,
      image_urls: ["https://img/l.jpg"],
      title: "Shirts",
      slug: "shirts",
      children: [],
      content_blocks: [],
    });
    expect(listing.ancestors).toEqual([
      {
        listing_id: "men",
        external_id: "ext-men",
        listing_type: "category",
        show_in_breadcrumbs: true,
        show_in_quicklinks: true,
        image_urls: [],
        title: "Men",
        slug: "men",
      },
    ]);
    expect(listing.siblings.map(sibling => sibling.listing_id)).toEqual(["knitwear", "shirts"]);
  });

  it("serves the quick links as children when the listing isn't among them", () => {
    const listing = native_listing_to_v3({ ...header, quick_links: [ref("oxford", "Oxford")] });
    expect(listing.siblings).toEqual([]);
    expect(listing.children.map(child => child.listing_id)).toEqual(["oxford"]);
  });
});

describe("native_suggest_to_v3", () => {
  it("maps query and listing suggestions", () => {
    expect(
      native_suggest_to_v3({
        request_id: "req-2",
        suggestions: [
          { type: "query", query: "shirt" },
          {
            type: "listing",
            listing: { id: "shirts", title: "Shirts", slug: "men-shirts", type: "category", images: [] },
            path: ["Men"],
          },
        ],
      })
    ).toEqual({
      suggestions_request_id: "req-2",
      suggestions: [
        { type: "query", query: "shirt", suggestions_result_id: "" },
        {
          type: "listing",
          listing_id: "shirts",
          listing_type: "category",
          show_in_breadcrumbs: true,
          show_in_quicklinks: true,
          image_urls: [],
          title: "Shirts",
          slug: "men-shirts",
          suggestions_result_id: "",
          ancestors: [],
        },
      ],
    });
  });
});

describe("suggestion ancestors from the listing tree", () => {
  const tree = [
    {
      id: "men",
      external_id: "18",
      title: "Men",
      slug: "men",
      type: "category",
      children: [
        { id: "shirts", external_id: "19", title: "Shirts", slug: "men-shirts", type: "category", children: [] },
      ],
    },
  ];
  const suggestion = (path: string[]) => ({
    request_id: "req",
    suggestions: [
      {
        type: "listing" as const,
        listing: { id: "shirts", title: "Shirts", type: "category", images: [] },
        path,
      },
    ],
  });

  it("names the ancestors by id, root first, as v3", () => {
    const [shirts] = native_suggest_to_v3(suggestion(["Men"]), ancestors_from_tree(tree)).suggestions;
    expect((shirts as { ancestors: unknown[] }).ancestors).toEqual([
      {
        listing_id: "men",
        external_id: "18",
        listing_type: "category",
        show_in_breadcrumbs: true,
        show_in_quicklinks: true,
        image_urls: [],
        title: "Men",
        slug: "men",
      },
    ]);
  });

  it("leaves them out when the tree doesn't know the listing or disagrees with the path", () => {
    const ancestors = (path: string[], lookup = ancestors_from_tree(tree)) =>
      (native_suggest_to_v3(suggestion(path), lookup).suggestions[0] as { ancestors: unknown[] }).ancestors;
    expect(ancestors(["Women"])).toEqual([]);
    expect(ancestors(["Men"], ancestors_from_tree([]))).toEqual([]);
    expect((native_suggest_to_v3(suggestion(["Men"])).suggestions[0] as { ancestors: unknown[] }).ancestors).toEqual(
      []
    );
  });
});

describe("query strings", () => {
  it("writes browse as V4's canonical GET form", () => {
    expect(
      browse_query_string({
        market: "se",
        locale: "sv-SE",
        query: "röd & blå",
        listing: { external_id: "a/b" },
        filter_by: "color:=[`red`] && price:[1..2]",
        sort: { field: "price", order: "asc" },
        include: ["facets", "sorts", "attributes"],
        cursor: "c_1-x",
        limit: 48,
      })
    ).toBe(
      "market=se&locale=sv-SE&query=r%C3%B6d%20%26%20bl%C3%A5&listing_external_id=a%2Fb" +
        "&filter_by=color%3A%3D%5B%60red%60%5D%20%26%26%20price%3A%5B1..2%5D&sort=price.asc" +
        "&include=facets,sorts,attributes&cursor=c_1-x&limit=48"
    );
    expect(browse_query_string({ market: "se", listing: { id: "l1" } })).toBe("market=se&listing=l1");
  });

  it("leaves out undefined flat parameters and converts the backend locale", () => {
    expect(
      flat_query_string([
        ["market", "se"],
        ["locale", undefined],
        ["query", ""],
      ])
    ).toBe("market=se&query=");
    expect(to_bcp47("sv_SE")).toBe("sv-SE");
    expect(to_bcp47(undefined)).toBeUndefined();
  });
});
