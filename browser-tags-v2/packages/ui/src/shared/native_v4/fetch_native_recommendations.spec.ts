import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fetchDepictRecommendations } from "../../sdks/fetchDepictRecommendations";
import { NativeDepictAPI } from "./NativeDepictAPI";
import { CONTEXT_TTL_MS, forget_recommendation_types } from "./context";
import { read_recent_views } from "./recent_views";
import type { BrowseResponse, ContextResponse, Product, RecommendationsResponse } from "./v4_types";

const card = (group_id: string, tracking = `d1.r.req.0.${group_id}`): Product => ({
  group_id,
  title: `Product ${group_id}`,
  slug: `product-${group_id}`,
  images: [`https://img/${group_id}.jpg`],
  in_stock: true,
  badges: [],
  price: { amount: 100, compare_at: 150 },
  variants: [{ product_id: `${group_id}-1`, in_stock: true, attributes: { item_group_id: `IG-${group_id}` } }],
  selected: 0,
  attributes: { item_group_id: `IG-${group_id}` },
  tracking_id: tracking,
});

const context = (recommendation_types: ContextResponse["recommendation_types"]): ContextResponse => ({
  request_id: "ctx",
  markets: [],
  recommendation_types,
});

const recs = (
  products: Product[],
  used_inputs: RecommendationsResponse["used_inputs"] = {}
): RecommendationsResponse => ({
  request_id: "req",
  currency: "SEK",
  products,
  used_inputs,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let fetch_mock: jest.Mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>;
const requested = () => fetch_mock.mock.calls.map(([url]) => String(url));
/** Answers each path with its body, in the order asked; a path asked again gets its last body. */
function serve(bodies: Record<string, unknown[]>) {
  fetch_mock.mockImplementation(async input => {
    const url = new URL(String(input));
    const key = url.pathname.split("/").pop()!;
    const queue = bodies[key];
    if (!queue?.length) return json({ error: { code: "not_found", message: key, request_id: "x" } }, 404);
    return json(queue.length > 1 ? queue.shift() : queue[0]);
  });
}

let unique = 0;
/** Context and view history are kept per merchant, so every test uses its own. */
let merchant: string;

beforeEach(() => {
  fetch_mock = jest.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
  globalThis.fetch = fetch_mock as unknown as typeof fetch;
  localStorage.clear();
  forget_recommendation_types();
  merchant = `shop${++unique}`;
});

afterEach(() => {
  jest.restoreAllMocks();
});

const similar = [{ type: "similar", inputs: ["anchor"] }];

describe("fetchDepictRecommendations with api: v4", () => {
  it("reads the surface's inputs from /context, then recommends with a GET carrying only those", async () => {
    serve({
      context: [context(similar)],
      recommendations: [recs([card("82")], { anchor: { type: "product", id: "73" } })],
    });
    const displays = await fetchDepictRecommendations({
      api: "v4",
      merchant,
      market: "se",
      locale: "en_GB",
      type: "similar",
      productId: "73",
      sessionId: "session",
      metadata: { a: "b" },
    });

    expect(requested()).toEqual([
      `https://api.depict.ai/v4/${merchant}/context`,
      `https://api.depict.ai/v4/${merchant}/recommendations?market=se&locale=en-GB&type=similar&anchor=product:73` +
        "&include=attributes",
    ]);
    for (const [, init] of fetch_mock.mock.calls) expect(init).toEqual({ method: "GET" });
    expect(displays).toEqual([
      {
        variant_index: 0,
        variant_displays: [
          {
            item_group_id: "IG-82",
            product_id: "82-1",
            main_product_id: "82",
            title: "Product 82",
            image_urls: ["https://img/82.jpg"],
            sale_price: 100,
            original_price: 150,
            in_stock: true,
            uri: "product-82",
          },
        ],
        recommendation_id: "d1.r.req.0.82",
      },
    ]);
  });

  it("keeps the v3 request when api isn't v4", async () => {
    fetch_mock.mockResolvedValueOnce(json({ displays: [] }));
    await fetchDepictRecommendations({ merchant, market: "se", locale: "en_GB", type: "similar", productId: "73" });
    const [url, init] = fetch_mock.mock.calls[0];
    expect(String(url)).toMatch(/^https:\/\/api\.depict\.ai\/v3\/recommend\/products\?/);
    const body = JSON.parse(String(init!.body));
    expect(body).toMatchObject({ merchant, type: "similar", product_ids: ["73"] });
    expect(body).not.toHaveProperty("api");

    fetch_mock.mockResolvedValueOnce(json({ displays: [] }));
    await fetchDepictRecommendations({ api: "v3", merchant, market: "se", locale: "en_GB", type: "x" });
    expect(String(fetch_mock.mock.calls[1][0])).toMatch(/\/v3\/recommend\/products\?/);
    expect(JSON.parse(String(fetch_mock.mock.calls[1][1]!.body))).not.toHaveProperty("api");
  });

  it("records a product page's resolved product as a view, and sends the history to a surface that reads it", async () => {
    const types = [
      { type: "pdp", inputs: ["anchor", "cart", "recent_views"] },
      { type: "recently_viewed", inputs: ["recent_views"] },
    ];
    serve({
      context: [context(types)],
      recommendations: [recs([card("1")], { anchor: { type: "product", id: "A" } }), recs([card("2")])],
    });
    const base = { api: "v4" as const, merchant, market: "se", locale: "en_GB" };

    await fetchDepictRecommendations({ ...base, type: "pdp", productId: "A" });
    expect(requested()[1]).not.toContain("recent_views");
    expect(read_recent_views(merchant).map(view => view.id)).toEqual(["A"]);

    await fetchDepictRecommendations({ ...base, type: "recently_viewed" });
    const url = new URL(requested()[2]);
    expect(url.searchParams.get("recent_views")).toMatch(/^A@\d{4}-\d\d-\d\dT/);
    expect(url.searchParams.get("anchor")).toBeNull();
    // /context was read once for both.
    expect(requested().filter(u => u.endsWith("/context"))).toHaveLength(1);
  });

  it("doesn't record an anchor V4 couldn't resolve, or a basket's first product", async () => {
    serve({
      context: [context([{ type: "pdp", inputs: ["anchor", "cart", "recent_views"] }])],
      recommendations: [recs([]), recs([], { anchor: { type: "product", id: "a" }, cart: ["a", "b"] })],
    });
    const base = { api: "v4" as const, merchant, market: "se", locale: "en_GB", type: "pdp" };
    await fetchDepictRecommendations({ ...base, productId: "gone" });
    await fetchDepictRecommendations({ ...base, productIds: ["a", "b"] });
    expect(read_recent_views(merchant)).toEqual([]);
    expect(new URL(requested()[2]).searchParams.get("cart")).toBe("a,b");
  });

  it("asks nothing for a type V4 doesn't serve the merchant", async () => {
    serve({ context: [context(similar)] });
    const displays = await fetchDepictRecommendations({
      api: "v4",
      merchant,
      market: "se",
      locale: "en_GB",
      type: "front_page",
    });
    expect(displays).toEqual([]);
    expect(requested()).toEqual([`https://api.depict.ai/v4/${merchant}/context`]);
  });

  it("returns no recommendations when V4 fails, and reads /context again next time", async () => {
    serve({});
    const options = { api: "v4" as const, merchant, market: "se", locale: "en_GB", type: "similar", productId: "1" };
    expect(await fetchDepictRecommendations(options)).toEqual([]);
    // /context failed: the anchor is sent anyway, and V4 decides.
    expect(requested()[1]).toContain("/recommendations?market=se&locale=en-GB&type=similar&anchor=product:1");
    await fetchDepictRecommendations(options);
    expect(requested().filter(u => u.endsWith("/context"))).toHaveLength(2);
  });

  it("reuses the merchant's recommendation types from localStorage until they expire", async () => {
    serve({ context: [context(similar)], recommendations: [recs([])] });
    const options = { api: "v4" as const, merchant, market: "se", locale: "en_GB", type: "similar", productId: "1" };
    const now = Date.now();
    await fetchDepictRecommendations(options);
    forget_recommendation_types(); // a new page load
    await fetchDepictRecommendations(options);
    expect(requested().filter(u => u.endsWith("/context"))).toHaveLength(1);

    forget_recommendation_types();
    jest.spyOn(Date, "now").mockReturnValue(now + CONTEXT_TTL_MS + 1);
    await fetchDepictRecommendations(options);
    expect(requested().filter(u => u.endsWith("/context"))).toHaveLength(2);
  });

  it("doesn't send the caller's headers, which would need a CORS preflight V4 doesn't allow", async () => {
    serve({ context: [context(similar)], recommendations: [recs([])] });
    await fetchDepictRecommendations({
      api: "v4",
      merchant,
      market: "se",
      locale: "en_GB",
      type: "similar",
      productId: "1",
      headers: { "X-Debug": "true" },
    });
    for (const [, init] of fetch_mock.mock.calls) expect(init).toEqual({ method: "GET" });
  });

  it("still works without localStorage", async () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    serve({
      context: [context([{ type: "pdp", inputs: ["anchor", "recent_views"] }])],
      recommendations: [recs([card("1")], { anchor: { type: "product", id: "A" } })],
    });
    const options = { api: "v4" as const, merchant, market: "se", locale: "en_GB", type: "pdp", productId: "A" };
    expect(await fetchDepictRecommendations(options)).toHaveLength(1);
    await fetchDepictRecommendations({ ...options, productId: "B" });
    expect(new URL(requested().at(-1)!).searchParams.get("recent_views")).toMatch(/^A@/);
  });
});

describe("NativeDepictAPI.get_recommended (the search page's related products)", () => {
  const browse = (products: Product[]): BrowseResponse => ({ request_id: "b", currency: "SEK", products });
  const hit = (group_id: string): Product => card(group_id, `d1.s.b.0.${group_id}`);

  it("searches, then recommends similar on the top hit excluding the others, as v3's facade", async () => {
    serve({
      context: [context(similar)],
      browse: [browse([hit("1"), hit("2"), hit("3")])],
      recommendations: [recs([card("9")], { anchor: { type: "product", id: "1-1" } })],
    });
    const result = await new NativeDepictAPI({}).get_recommended({
      merchant,
      market: "se",
      locale: "en_GB",
      query: " shirt ",
    });

    expect(requested()).toEqual([
      `https://api.depict.ai/v4/${merchant}/context`,
      `https://api.depict.ai/v4/${merchant}/browse?market=se&locale=en-GB&query=shirt&limit=100`,
      `https://api.depict.ai/v4/${merchant}/recommendations?market=se&locale=en-GB&type=similar&anchor=product:1-1` +
        "&exclude=2-1,3-1&include=attributes",
    ]);
    expect(result.failed).toBeUndefined();
    expect(result.displays.map(display => (display as { recommendation_id?: string }).recommendation_id)).toEqual([
      "d1.r.req.0.9",
    ]);
    // Related products aren't views.
    expect(read_recent_views(merchant)).toEqual([]);
  });

  it("merges a composed search surface's answers per hit, first wins", async () => {
    serve({
      context: [context([{ type: "search", inputs: ["anchor", "cart", "recent_views"] }, ...similar])],
      browse: [browse([hit("1"), hit("2")])],
      recommendations: [recs([card("a"), card("b"), card("c")]), recs([card("b"), card("d"), card("e")])],
    });
    const result = await new NativeDepictAPI({}).get_recommended({
      merchant,
      market: "se",
      locale: "en_GB",
      query: "dress",
    });
    const recs_urls = requested().filter(url => url.includes("/recommendations?"));
    expect(recs_urls.map(url => new URL(url).searchParams.get("anchor"))).toEqual(["product:1-1", "product:2-1"]);
    expect(recs_urls.every(url => new URL(url).searchParams.get("type") === "search")).toBe(true);
    expect(result.displays.map(display => (display as { recommendation_id?: string }).recommendation_id)).toEqual([
      "d1.r.req.0.a",
      "d1.r.req.0.b",
      "d1.r.req.0.d",
    ]); // as long as one answer, as the surface's limit
  });

  it("serves no related products when V4 has no surface for them", async () => {
    serve({ context: [context([])] });
    const result = await new NativeDepictAPI({}).get_recommended({
      merchant,
      market: "se",
      locale: "en_GB",
      query: "bag",
    });
    expect(result.displays).toEqual([]);
    expect(requested()).toHaveLength(1);
  });

  it("serves v3's fallback (no related products) when V4 fails", async () => {
    serve({ context: [context(similar)] });
    const result = await new NativeDepictAPI({}).get_recommended({
      merchant,
      market: "se",
      locale: "en_GB",
      query: "linen",
    });
    expect(result).toEqual({ displays: [] });
  });

  it("is never the v3 endpoint", async () => {
    serve({ context: [context(similar)], browse: [browse([])] });
    await new NativeDepictAPI({}).get_recommended({ merchant, market: "se", locale: "en_GB", query: "knit" });
    expect(requested().some(url => url.includes("/v3/"))).toBe(false);
  });
});
