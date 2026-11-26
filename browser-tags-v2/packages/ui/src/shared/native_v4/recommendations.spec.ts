import { describe, expect, it } from "@jest/globals";
import {
  interleave_first_wins,
  recommendations_query_string,
  related_requests,
  to_native_recommendations_request,
} from "./recommendations";
import type { Product, RecentView } from "./v4_types";

const call = { type: "pdp", market: "se", locale: "sv-SE" };
const views: RecentView[] = [
  { id: "v-2", at: "2026-11-19T10:00:00.000Z" },
  { id: "v-1", at: "2026-11-18T10:00:00.000Z" },
];

const card = (
  group_id: string,
  ids: [string, ...string[]] = [`${group_id}-a`, `${group_id}-b`],
  selected = 0
): Product => ({
  group_id,
  title: group_id,
  slug: group_id,
  images: [],
  in_stock: true,
  badges: [],
  price: { amount: 1 },
  variants: ids.map(product_id => ({ product_id, in_stock: true })) as Product["variants"],
  selected,
  tracking_id: `d1.r.req.0.${group_id}`,
});

describe("to_native_recommendations_request", () => {
  it("anchors a product page on its product and asks for the merchant's card attributes", () => {
    expect(to_native_recommendations_request({ ...call, productId: "P-1" }, ["anchor"], views)).toEqual({
      market: "se",
      locale: "sv-SE",
      type: "pdp",
      anchor: { type: "product", id: "P-1" },
      include: ["attributes"],
    });
  });

  it("anchors on a category", () => {
    expect(to_native_recommendations_request({ ...call, categoryId: "c-1" }, ["anchor"], [])?.anchor).toEqual({
      type: "category",
      id: "c-1",
    });
  });

  it("sends only the inputs the surface reads: no views or cart to an anchor-only surface", () => {
    const request = to_native_recommendations_request({ ...call, productIds: ["a", "b"] }, ["anchor"], views);
    expect(request).toEqual({
      market: "se",
      locale: "sv-SE",
      type: "pdp",
      anchor: { type: "product", id: "a" },
      exclude: ["b"],
      include: ["attributes"],
    });
  });

  it("sends a basket as the cart, deduplicated in order, and the view history, on a surface that reads them", () => {
    const request = to_native_recommendations_request(
      { ...call, productIds: ["a", "b", "a", ""] },
      ["cart", "recent_views"],
      views
    );
    expect(request?.cart).toEqual(["a", "b"]);
    expect(request?.recent_views).toEqual(views);
    expect(request?.anchor).toBeUndefined();
    expect(request?.exclude).toBeUndefined();
  });

  it("sends the anchor, cart and views to a composed product surface", () => {
    const request = to_native_recommendations_request(
      { ...call, productIds: ["a", "b"] },
      ["anchor", "cart", "recent_views"],
      views
    );
    expect(request).toMatchObject({
      anchor: { type: "product", id: "a" },
      exclude: ["b"],
      cart: ["a", "b"],
      recent_views: views,
    });
  });

  it("sends no ids to a surface that reads no anchor, as v3 ignores them", () => {
    const request = to_native_recommendations_request({ ...call, productId: "P-1" }, ["recent_views"], views);
    expect(request?.anchor).toBeUndefined();
    expect(request?.recent_views).toEqual(views);
  });

  it("sends no empty history", () => {
    expect(to_native_recommendations_request(call, ["recent_views"], [])).toEqual({
      market: "se",
      locale: "sv-SE",
      type: "pdp",
      include: ["attributes"],
    });
  });

  it("skips an anchor-only surface without an id, which V4 would answer with a 400", () => {
    expect(to_native_recommendations_request(call, ["anchor"], views)).toBeUndefined();
  });

  it("sends just the anchor when the surface's inputs are unknown", () => {
    const request = to_native_recommendations_request({ ...call, productId: "P-1" }, undefined, views);
    expect(request).toEqual({
      market: "se",
      locale: "sv-SE",
      type: "pdp",
      anchor: { type: "product", id: "P-1" },
      include: ["attributes"],
    });
    expect(to_native_recommendations_request(call, undefined, views)).toBeDefined();
  });

  it("caps the limit and the id lists at V4's bounds", () => {
    const many = Array.from({ length: 150 }, (_, i) => `id-${i}`);
    const request = to_native_recommendations_request(
      { ...call, productIds: many, limit: 500 },
      ["anchor", "cart"],
      []
    );
    expect(request?.limit).toBe(100);
    expect(request?.cart).toHaveLength(100);
    expect(request?.exclude).toHaveLength(100);
  });
});

describe("recommendations_query_string", () => {
  it("writes V4's canonical parameter order and list forms", () => {
    expect(
      recommendations_query_string({
        market: "se",
        locale: "sv-SE",
        type: "pdp",
        anchor: { type: "product", id: "a:b" },
        cart: ["x,1", "y"],
        recent_views: [{ id: "v@1", at: "2026-11-19T10:00:00.000Z" }],
        exclude: ["z"],
        limit: 12,
        include: ["attributes"],
      })
    ).toBe(
      "market=se&locale=sv-SE&type=pdp&anchor=product:a%3Ab&cart=x%2C1,y" +
        "&recent_views=v%401@2026-11-19T10%3A00%3A00.000Z&exclude=z&limit=12&include=attributes"
    );
  });

  it("leaves out what isn't set", () => {
    expect(recommendations_query_string({ market: "se", type: "front page" })).toBe("market=se&type=front%20page");
  });
});

describe("related_requests", () => {
  const hits = [card("g1", ["1a", "1b"], 1), card("g2"), card("g3")];

  it("anchors similar on the top hit's shown variant and excludes the other hits, as v3's facade", () => {
    expect(related_requests(hits, { market: "se", locale: "en-GB" }, "similar")).toEqual([
      {
        market: "se",
        locale: "en-GB",
        type: "similar",
        anchor: { type: "product", id: "1b" },
        exclude: ["g2-a", "g3-a"],
        include: ["attributes"],
      },
    ]);
  });

  it("anchors a composed search surface on each of the first ten hits", () => {
    const many = Array.from({ length: 12 }, (_, i) => card(`g${i}`));
    const requests = related_requests(many, { market: "se" }, "search");
    expect(requests).toHaveLength(10);
    expect(requests[3].anchor).toEqual({ type: "product", id: "g3-a" });
    expect(requests[3].exclude).toHaveLength(11);
    expect(requests[3].exclude).not.toContain("g3-a");
  });

  it("asks nothing without hits", () => {
    expect(related_requests([], { market: "se" }, "similar")).toEqual([]);
  });
});

describe("interleave_first_wins", () => {
  it("takes each list's first, then each list's second, skipping a group already taken, up to the limit", () => {
    const merged = interleave_first_wins(
      [
        [card("a"), card("b"), card("c")],
        [card("b"), card("d")],
      ],
      4
    );
    expect(merged.map(product => product.group_id)).toEqual(["a", "b", "d", "c"]);
  });

  it("stops at the limit", () => {
    expect(interleave_first_wins([[card("a"), card("b")], [card("c")]], 2).map(p => p.group_id)).toEqual(["a", "c"]);
  });
});
