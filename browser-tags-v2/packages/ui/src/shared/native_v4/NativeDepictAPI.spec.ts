import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { DepictAPI } from "../DepictAPI";
import * as IdTypes from "../../category_listing/IdTypes";
import { create_depict_api, NativeDepictAPI } from "./NativeDepictAPI";
import type { BrowseResponse, Facet, Product } from "./v4_types";
import type { SearchFilter } from "@depict-ai/types/api/SearchRequestV3";

const card = (id: string): Product => ({
  group_id: `g${id}`,
  title: `Product ${id}`,
  slug: `product-${id}`,
  images: [`https://img/${id}.jpg`],
  in_stock: true,
  badges: [],
  price: { amount: 100 },
  variants: [{ product_id: id, in_stock: true }],
  selected: 0,
  tracking_id: `d1.s.req.${id}`,
});

const colour_facet: Facet = {
  field: "var_color",
  type: "swatch",
  title: "Färg",
  expanded: true,
  values: [{ value: "Green", label: "Green", count: 3, selected: false }],
};

const browse = (overrides: Partial<BrowseResponse> = {}): BrowseResponse => ({
  request_id: "req",
  currency: "SEK",
  products: [card("1"), card("2")],
  total: 2,
  facets: [colour_facet],
  sorts: [],
  ...overrides,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let fetch_mock: jest.Mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>;
const requested = () => fetch_mock.mock.calls.map(([url]) => String(url));

beforeEach(() => {
  fetch_mock = jest.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
  globalThis.fetch = fetch_mock as unknown as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
});

const base = { merchant: "demo", market: "se", locale: "sv_SE" };
let unique = 0;
/** DepictAPI caches by request, so every test asks something new. */
const query = () => `shirt ${++unique}`;

describe("create_depict_api", () => {
  it("keeps v3 the default and makes the native API only for v4", () => {
    expect(create_depict_api(undefined, {})).not.toBeInstanceOf(NativeDepictAPI);
    expect(create_depict_api("v3", {})).not.toBeInstanceOf(NativeDepictAPI);
    expect(create_depict_api("v4", {})).toBeInstanceOf(NativeDepictAPI);
    expect(create_depict_api("v4", {})).toBeInstanceOf(DepictAPI);
  });
});

describe("NativeDepictAPI", () => {
  it("searches with a GET on V4 browse, sending only fields the strict contract takes", async () => {
    fetch_mock.mockResolvedValueOnce(json(browse()));
    const q = query();
    const result = await new NativeDepictAPI({}).query({ ...base, query: q, limit: 24 });

    const [url] = requested();
    expect(url).toBe(
      `https://api.depict.ai/v4/demo/browse?market=se&locale=sv-SE&query=${encodeURIComponent(q)}` +
        "&include=facets,sorts,content,attributes"
    );
    expect(fetch_mock.mock.calls[0][1]).toEqual({ method: "GET" });
    expect(result.failed).toBeUndefined();
    expect(result.n_hits).toBe(2);
    expect(result.search_request_id).toBe("req");
    expect(result.displays.map(display => display.search_result_id)).toEqual(["d1.s.req.1", "d1.s.req.2"]);
    // depict-ui's own post-processing still runs: the filter's group title becomes its field.
    expect(result.filters).toEqual([expect.objectContaining({ field: "färg", actual_field: "var_color", op: "in" })]);
  });

  it("reads a listing's products by id or external id, with sort, filters and a capped page", async () => {
    const api = new NativeDepictAPI({});
    fetch_mock.mockResolvedValueOnce(json(browse()));
    await api.query({ ...base, query: query() }); // learns the facet titles
    fetch_mock.mockResolvedValueOnce(json(browse({ products: [card("3")] })));
    const result = await api.get_listing_products({
      ...base,
      id_to_query_for_: "ext/1",
      id_type_: IdTypes.EXTERNAL_ID,
      currentListingForTransformer_: Promise.resolve({} as never),
      sort: { field: "sale_price", order: "asc" },
      filters: [{ field: "färg", op: "in", data: ["Green"] }],
      limit: 48,
    });
    expect(requested()[1]).toBe(
      "https://api.depict.ai/v4/demo/browse?market=se&locale=sv-SE&listing_external_id=ext%2F1" +
        "&filter_by=var_color%3A%3D%5B%60Green%60%5D&sort=price.asc&include=facets,sorts,attributes&limit=48"
    );
    expect(result.product_listing_request_id).toBe("req");
    expect(result.displays[0].product_listing_result_id).toBe("d1.s.req.3");
  });

  it("reads the facets once to resolve a filter title it hasn't seen, as on a page opened from a link", async () => {
    fetch_mock.mockResolvedValueOnce(json(browse({ products: [card("1")] }))).mockResolvedValueOnce(json(browse()));
    const q = query();
    await new NativeDepictAPI({}).query({ ...base, query: q, filters: [{ field: "färg", op: "in", data: ["Green"] }] });
    const [learn, real] = requested();
    expect(learn).toBe(
      `https://api.depict.ai/v4/demo/browse?market=se&locale=sv-SE&query=${encodeURIComponent(
        q
      )}&include=facets&limit=1`
    );
    expect(real).toContain("&filter_by=var_color%3A%3D%5B%60Green%60%5D&");
  });

  describe("a filtered link opened in a new page load (a reload) sends what the page sent before it", () => {
    // iciw, en-GB: the category tree is titled "Category", the brand facet "Collection", the colours "Colour". A
    // title that is also a reserved field (category, price) names another facet's field than that one.
    const facet = (field: string, type: Facet["type"], title: string, value: string): Facet =>
      ({
        field,
        type,
        title,
        expanded: true,
        values: [{ value, label: value, count: 3, selected: false }],
      }) as Facet;
    const facets: Facet[] = [
      facet("product_scollection_category_hierarchy", "hierarchy", "Category", "Women # Tights & Leggings"),
      facet("brand", "checkbox", "Collection", "Define Seamless Collection"),
      facet("color_with_hex_list", "swatch", "Colour", "Black;0d0d0d"),
      { field: "list_price", type: "range", title: "Price", expanded: true, min: 0, max: 900 } as Facet,
      facet("size_name", "grid", "Size", "S"),
    ];
    it.each<[string, SearchFilter, string]>([
      [
        "category tree, a parent with its whole subtree",
        { field: "category", op: "in", data: [["Women"], ["Women", "Tights & Leggings"]] },
        "product_scollection_category_hierarchy:=[`Women`,`Women # Tights & Leggings`]",
      ],
      [
        "checkbox on the brand field",
        { field: "collection", op: "in", data: ["Define Seamless Collection"] },
        "brand:=[`Define Seamless Collection`]",
      ],
      ["colour", { field: "colour", op: "in", data: ["Black;0d0d0d"] }, "color_with_hex_list:=[`Black;0d0d0d`]"],
      ["range titled Price", { field: "price", op: "inrange", data: [100, 500] }, "list_price:[100..500]"],
      ["grid", { field: "size", op: "in", data: ["S"] }, "size_name:=[`S`]"],
    ])("%s", async (_kind, filter, expected) => {
      fetch_mock.mockImplementation(async () => json(browse({ facets })));
      const q = query();
      await new NativeDepictAPI({}).query({ ...base, query: q, filters: [filter] });
      const [learn, real] = requested();
      expect(learn).toBe(
        `https://api.depict.ai/v4/demo/browse?market=se&locale=sv-SE&query=${encodeURIComponent(
          q
        )}&include=facets&limit=1`
      );
      expect(new URL(real).searchParams.get("filter_by")).toBe(expected);
    });
  });

  it("sends a toggle from a link without reading the facets first", async () => {
    fetch_mock.mockResolvedValueOnce(json(browse()));
    await new NativeDepictAPI({}).query({
      ...base,
      query: query(),
      filters: [{ field: "in_stock", op: "eq", data: "true" }],
    });
    expect(requested()).toHaveLength(1);
    expect(requested()[0]).toContain("&filter_by=in_stock%3A%3Dtrue&");
  });

  it("counts the products it has seen when V4 withholds the total", async () => {
    const api = new NativeDepictAPI({});
    const q = query();
    fetch_mock.mockResolvedValueOnce(json(browse({ total: undefined, cursor: "next" })));
    const first = await api.query({ ...base, query: q });
    expect(first.n_hits).toBe(2);
    expect(first.cursor).toBe("next");
    fetch_mock.mockResolvedValueOnce(json(browse({ total: undefined, products: [card("3")] })));
    const second = await api.query({ ...base, query: q, cursor: "next" });
    expect(requested()[1]).toContain("&cursor=next");
    expect(second.n_hits).toBe(3);
    expect(second.cursor).toBeUndefined();
  });

  it("chains V4's pages for a page over its largest", async () => {
    const api = new NativeDepictAPI({});
    const hundred = Array.from({ length: 100 }, (_, index) => card(`a${index}`));
    fetch_mock
      .mockResolvedValueOnce(json(browse({ products: hundred, cursor: "p2", total: 500 })))
      .mockResolvedValueOnce(json(browse({ products: [card("b1"), card("b2")], cursor: "p3", facets: undefined })));
    const result = await api.query({ ...base, query: query(), limit: 102 });
    expect(requested()[0]).toContain("&limit=100");
    expect(requested()[1]).toContain("&include=attributes&cursor=p2&limit=2");
    expect(result.displays).toHaveLength(102);
    expect(result.cursor).toBe("p3");
  });

  it("serves the fallback on a 4xx without retrying, and retries a 5xx only twice", async () => {
    fetch_mock.mockResolvedValue(json({ error: { code: "bad_request", message: "no", request_id: "r" } }, 400));
    const bad = await new NativeDepictAPI({}).query({ ...base, query: query() });
    expect(bad.failed).toBe(true);
    expect(fetch_mock).toHaveBeenCalledTimes(1);

    fetch_mock.mockReset();
    fetch_mock.mockImplementation(async () =>
      json({ error: { code: "upstream_unavailable", message: "down", request_id: "r" } }, 503)
    );
    const down = await new NativeDepictAPI({}).query({ ...base, query: query() });
    expect(down.failed).toBe(true);
    expect(fetch_mock).toHaveBeenCalledTimes(3);
  });

  describe("a filter V4 can't take doesn't cost the shopper the page", () => {
    const filter_by_of = (url: string) => new URL(url).searchParams.get("filter_by");
    const unknown_field = (field: string) =>
      json(
        {
          error: {
            code: "unknown_filter_field",
            message: `unknown filter field "${field}"`,
            request_id: "r",
            path: ["filter_by"],
            allowed: ["in_stock", "price", "size_name"],
          },
        },
        400
      );

    it("leaves out a filter removed from the store, asks again, and doesn't send it for the next page", async () => {
      const removed = { field: "removed_field", op: "in" as const, data: ["x"] };
      const in_stock = { field: "in_stock", op: "eq" as const, data: "true" };
      fetch_mock.mockImplementation(async input => {
        const filter_by = filter_by_of(String(input));
        return filter_by?.includes("removed_field")
          ? unknown_field("removed_field")
          : json(browse({ cursor: "c2", facets: [] }));
      });
      const api = new NativeDepictAPI({});
      const q = query();
      const result = await api.query({ ...base, query: q, filters: [removed, in_stock] as SearchFilter[] });

      expect(result.failed).toBeUndefined();
      expect(result.displays).toHaveLength(2);
      // The facets read for the unresolved field, the refused page, the page without the removed filter.
      expect(requested().map(filter_by_of)).toEqual([null, "removed_field:=[`x`] && in_stock:=true", "in_stock:=true"]);

      fetch_mock.mockClear();
      await api.query({ ...base, query: q, cursor: "c2", filters: [removed, in_stock] as SearchFilter[] });
      expect(requested().map(filter_by_of)).toEqual(["in_stock:=true"]);
    });

    it("leaves out a value V4 refuses (invalid_filter)", async () => {
      fetch_mock
        .mockResolvedValueOnce(
          json(
            {
              error: {
                code: "invalid_filter",
                message: 'filter_by: "in_stock" takes true or false',
                request_id: "r",
                path: ["filter_by"],
              },
            },
            400
          )
        )
        .mockResolvedValueOnce(json(browse()));
      const result = await new NativeDepictAPI({}).query({
        ...base,
        query: query(),
        filters: [{ field: "in_stock", op: "eq", data: "maybe" }] as SearchFilter[],
      });
      expect(result.failed).toBeUndefined();
      expect(requested().map(filter_by_of)).toEqual(["in_stock:=`maybe`", null]);
    });

    it("leaves out a filter the adapter can't write, and still sends the rest", async () => {
      fetch_mock.mockResolvedValueOnce(json(browse()));
      const result = await new NativeDepictAPI({}).query({
        ...base,
        query: query(),
        filters: [
          { field: "in_stock", op: "eq", data: "true" },
          { field: "sale_price", op: "inrange", data: [1] },
        ] as SearchFilter[],
      });
      expect(result.failed).toBeUndefined();
      expect(requested().map(filter_by_of)).toEqual(["in_stock:=true"]);
    });

    it("still serves the fallback for a 400 that isn't about a filter, without asking again", async () => {
      fetch_mock.mockResolvedValue(json({ error: { code: "unknown_market", message: "no", request_id: "r" } }, 400));
      const result = await new NativeDepictAPI({}).query({
        ...base,
        query: query(),
        filters: [{ field: "in_stock", op: "eq", data: "true" }] as SearchFilter[],
      });
      expect(result.failed).toBe(true);
      expect(fetch_mock).toHaveBeenCalledTimes(1);
    });
  });

  it("sends a discount link with no operator (in) as 'this discount or more'", async () => {
    fetch_mock.mockImplementation(async () => json(browse()));
    await new NativeDepictAPI({}).query({
      ...base,
      query: query(),
      filters: [{ field: "discount", op: "in", data: ["0.2"] }] as SearchFilter[],
    });
    // `discount` isn't a served facet here, so the facets are read first.
    expect(new URL(requested().at(-1)!).searchParams.get("filter_by")).toBe("discount:>=0.2");
  });

  it("reads a listing header by id or external id", async () => {
    const listing = {
      id: "l1",
      external_id: "19",
      title: "Shirts",
      slug: "men-shirts",
      type: "category",
      show_in_breadcrumbs: true,
      breadcrumbs: [{ id: "l0", title: "Men" }],
      quick_links: [],
      images: [],
      content_blocks: [],
    };
    fetch_mock.mockImplementation(async () => json({ request_id: "req", listing }));
    const api = new NativeDepictAPI({});
    const by_id = await api.get_listing({ ...base, id_to_query_for_: "l1", id_type_: IdTypes.LISTING_ID });
    await api.get_listing({ ...base, id_to_query_for_: "19", id_type_: IdTypes.EXTERNAL_ID });
    expect(requested()).toEqual([
      "https://api.depict.ai/v4/demo/listings/l1?market=se&locale=sv-SE",
      "https://api.depict.ai/v4/demo/listings?market=se&locale=sv-SE&external_id=19",
    ]);
    expect(by_id).toMatchObject({ listing_id: "l1", title: "Shirts", content_blocks: [] });
    expect(by_id.breadcrumbs.map(crumb => crumb.listing_id)).toEqual(["l0"]);
  });

  it("reads suggestions, the empty query (start view) included", async () => {
    fetch_mock.mockResolvedValueOnce(json({ request_id: "req", suggestions: [{ type: "query", query: "shirt" }] }));
    const result = await new NativeDepictAPI({}).suggest({ ...base, query: "" });
    expect(requested()).toEqual(["https://api.depict.ai/v4/demo/suggest?market=se&locale=sv-SE&query="]);
    expect(result.suggestions).toEqual([{ type: "query", query: "shirt", suggestions_result_id: "" }]);
  });

  it("reads the listing tree once to name listing suggestions' ancestors", async () => {
    const tree = {
      request_id: "t",
      listings: [
        {
          id: "l0",
          title: "Men",
          type: "category",
          children: [{ id: "l1", title: "Shirts", type: "category", children: [] }],
        },
      ],
    };
    const suggestions = {
      request_id: "req",
      suggestions: [
        { type: "listing", listing: { id: "l1", title: "Shirts", type: "category", images: [] }, path: ["Men"] },
      ],
    };
    fetch_mock.mockImplementation(async url => json(String(url).includes("/listings?") ? tree : suggestions));
    const api = new NativeDepictAPI({});
    const first = await api.suggest({ ...base, query: "sh" });
    await api.suggest({ ...base, query: "shi" });
    expect(requested()).toEqual([
      "https://api.depict.ai/v4/demo/suggest?market=se&locale=sv-SE&query=sh",
      "https://api.depict.ai/v4/demo/listings?market=se&locale=sv-SE",
      "https://api.depict.ai/v4/demo/suggest?market=se&locale=sv-SE&query=shi",
    ]);
    expect((first.suggestions[0] as { ancestors: { listing_id: string }[] }).ancestors.map(a => a.listing_id)).toEqual([
      "l0",
    ]);
  });

  // get_recommended (search-related recommendations) reads native V4 too: fetch_native_recommendations.spec.ts.
});
