import type { Product, RecentView, RecommendationInput, RecommendationsRequest } from "./v4_types";

/** V4's largest `limit`, and the most ids `cart` and `exclude` take. */
export const MAX_RECS_LIMIT = 100;
const MAX_IDS = 100;
/** The most products V4's `recent_views` takes. */
const MAX_VIEWS = 50;

/** What a v3 recommendations call names, as fetchDepictRecommendations takes it. */
export type V3RecsInputs = {
  type: string;
  market: string;
  /** BCP 47 (`sv-SE`). */
  locale?: string;
  productId?: string;
  productIds?: readonly string[];
  categoryId?: string;
  limit?: number;
};

const distinct = (ids: readonly (string | undefined)[]) => [
  ...new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0)),
];

/**
 * A v3 recommendations call as a native `/recommendations` request, sending only the inputs the surface reads
 * (`/context` `recommendation_types`): V4 answers an input the surface doesn't read with a 400 `unsupported_input`.
 * `inputs` undefined means `/context` couldn't be read: then only an anchor is sent, if the call names one, and V4
 * says whether the surface takes it.
 *
 * - `categoryId` is a category anchor; `productId` a product anchor.
 * - `productIds` (a basket) is the `cart` on a surface that reads one. On a surface that reads an anchor the first is
 *   the anchor and the rest are excluded, as v3's facade does; its multi-anchor merge (one recommendation list per id,
 *   interleaved, for composed surfaces) has no native counterpart, since a request has one anchor.
 * - On a surface that reads no anchor, ids are not sent, as on v3.
 * - `recent_views` is the browser's view history (recent_views.ts), on a surface that reads it.
 *
 * Returns undefined when the surface reads only an anchor and the call names none: V4 answers that with a 400, and v3
 * with no recommendations.
 */
export function to_native_recommendations_request(
  call: V3RecsInputs,
  inputs: readonly RecommendationInput[] | undefined,
  recent_views: readonly RecentView[]
): RecommendationsRequest | undefined {
  const reads = (input: RecommendationInput) => (inputs ? inputs.includes(input) : input === "anchor");
  const product_ids = distinct(call.productIds ?? []);
  const request: RecommendationsRequest = {
    market: call.market,
    ...(call.locale ? { locale: call.locale } : {}),
    type: call.type,
  };

  if (reads("anchor")) {
    if (call.categoryId) {
      request.anchor = { type: "category", id: call.categoryId };
    } else if (call.productId) {
      request.anchor = { type: "product", id: call.productId };
    } else if (product_ids.length) {
      const [first, ...rest] = product_ids;
      request.anchor = { type: "product", id: first };
      if (rest.length) request.exclude = rest.slice(0, MAX_IDS);
    }
  }
  if (reads("cart") && product_ids.length) {
    request.cart = product_ids.slice(0, MAX_IDS) as RecommendationsRequest["cart"];
  }
  if (reads("recent_views") && recent_views.length) {
    request.recent_views = recent_views.slice(0, MAX_VIEWS) as RecommendationsRequest["recent_views"];
  }
  if (call.limit) request.limit = Math.min(Math.max(1, Math.floor(call.limit)), MAX_RECS_LIMIT);
  request.include = ["attributes"];

  const anchor_only = inputs?.length === 1 && inputs[0] === "anchor";
  if (anchor_only && !request.anchor) return undefined;
  return request;
}

/** `encodeURIComponent`, as V4's own encoder writes a value (`+` would mean a space). */
const encode = (value: string) => encodeURIComponent(value);

/**
 * A recommendations request as V4's canonical GET query string (realtime `v4/worker/src/requests.ts`
 * `recommendationsCodec`). Lists are comma-separated with each value encoded, so an id's own comma is `%2C`; an anchor
 * is `type:id`, and a view `id@time`. V4 rejects any parameter it doesn't know with a 400.
 */
export function recommendations_query_string(request: RecommendationsRequest): string {
  const pairs: string[] = [];
  const add = (key: string, value: string | undefined) => value !== undefined && pairs.push(`${key}=${value}`);
  const list = (values: readonly string[] | undefined) => values?.map(encode).join(",");
  add("market", encode(request.market));
  add("locale", request.locale === undefined ? undefined : encode(request.locale));
  add("type", encode(request.type));
  add("anchor", request.anchor && `${encode(request.anchor.type)}:${encode(request.anchor.id)}`);
  add("cart", list(request.cart));
  add("recent_views", request.recent_views?.map(view => `${encode(view.id)}@${encode(view.at)}`).join(","));
  add("query", request.query === undefined ? undefined : encode(request.query));
  add("exclude", list(request.exclude));
  add("limit", request.limit === undefined ? undefined : String(request.limit));
  add("include", list(request.include));
  return pairs.join("&");
}

/** The product id a card shows: its selected variant's, as v3's facade anchors related recommendations on it. */
export const shown_product_id = (product: Product) =>
  product.variants[product.selected]?.product_id ?? product.group_id;

/**
 * v3's search-related recommendations as native requests, as v3's facade builds them (realtime
 * `facade/v3Search.ts` `relatedRequests`): recommendations anchored on the top search hits, each excluding every other
 * hit. A composed `search` surface anchors on each of the first ten hits; otherwise `similar` anchors on the first.
 */
export function related_requests(
  hits: readonly Product[],
  scope: { market: string; locale?: string },
  type: "search" | "similar"
): RecommendationsRequest[] {
  const anchors = hits.slice(0, type === "search" ? 10 : 1);
  return anchors.map((anchor, at) => {
    const exclude = hits.filter((_, index) => index !== at).map(shown_product_id);
    return {
      market: scope.market,
      ...(scope.locale ? { locale: scope.locale } : {}),
      type,
      anchor: { type: "product", id: shown_product_id(anchor) },
      ...(exclude.length ? { exclude: exclude.slice(0, MAX_IDS) } : {}),
      include: ["attributes"],
    };
  });
}

/**
 * Several recommendation lists as one, as v3's facade merges multi-anchor answers (`interleaveFirstWins`): the first
 * product of each list in turn, then the second of each, skipping a product (group) already taken, up to `limit`.
 */
export function interleave_first_wins(lists: readonly (readonly Product[])[], limit: number): Product[] {
  const merged: Product[] = [];
  const taken = new Set<string>();
  const depth = Math.max(0, ...lists.map(list => list.length));
  for (let index = 0; index < depth; index++) {
    for (const list of lists) {
      const product = list[index];
      if (product === undefined || taken.has(product.group_id)) continue;
      taken.add(product.group_id);
      merged.push(product);
      if (merged.length >= limit) return merged;
    }
  }
  return merged;
}
