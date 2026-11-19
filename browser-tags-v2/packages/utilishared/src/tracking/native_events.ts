import type { depict_body } from "./depict_transmission";

/**
 * Where tracking events go: `v3` (the default) posts every event to `/create-events`; `v4` posts each event that the
 * native events contract can carry to `/v4/{merchant}/events` (NDJSON) and leaves the rest on `/create-events`.
 */
export type EventApi = "v3" | "v4";

/**
 * One line of `POST /v4/{merchant}/events`, as the strict V4 contract (`Event` in realtime `v4/types`) defines it.
 * Only these keys are sent.
 */
export type NativeEvent = {
  event_id: string;
  type: "impression" | "click" | "add_to_cart" | "product_view" | "purchase";
  market: string;
  session_id: string;
  ts: string;
  product_id?: string;
  tracking_id?: string;
  url?: string;
  referrer?: string;
  purchase?: {
    transaction_id: string;
    currency: string;
    items: { sku: string; price: number; quantity: number }[];
  };
};

/** The contract's limits, so an event V4 would reject stays on v3 instead of being dropped. */
const EVENT_ID_MAX = 128;
const MARKET_MAX = 128;
const SESSION_ID_MAX = 256;
const PRODUCT_ID_MAX = 500;
const TRACKING_ID_MAX = 1536;
const MERCHANT = /^[a-z0-9][a-z0-9._-]{0,63}$/;
/** V4's card tracking id (`d1.<kind>.<request id>.<position>.<product>[.<context>]`); V4 writes no row for others. */
const D1_TRACKING_ID = /^d1\.[slrp]\.[0-9a-f]{32}\.(0|[1-9][0-9]{0,4})\.[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)?$/;
const CURRENCY = /^[A-Z]{3}$/;

const non_empty = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= max;

/** The merchant's path segment on V4, or undefined if the tenant isn't one V4 accepts. */
export function native_merchant(tenant: unknown): string | undefined {
  return typeof tenant === "string" && MERCHANT.test(tenant) ? tenant : undefined;
}

/** A d1 tracking id that fits the contract, or undefined. */
export function native_tracking_id(value: unknown): string | undefined {
  return typeof value === "string" && value.length <= TRACKING_ID_MAX && D1_TRACKING_ID.test(value) ? value : undefined;
}

/**
 * The fields every native event needs, or undefined when the v3 event lacks one, so it stays on v3.
 */
export function native_base(
  body: { deduplication_id?: unknown; market?: unknown; session_id?: unknown },
  ts: string
): Pick<NativeEvent, "event_id" | "market" | "session_id" | "ts"> | undefined {
  const { deduplication_id, market, session_id } = body;
  if (!non_empty(deduplication_id, EVENT_ID_MAX) || !non_empty(market, MARKET_MAX)) return undefined;
  if (!non_empty(session_id, SESSION_ID_MAX)) return undefined;
  return { event_id: deduplication_id, market, session_id, ts };
}

/**
 * Maps a v3 `/create-events` body to a native V4 event, with the merchant it's posted under. Undefined means V4
 * can't take it as v3 did, so it stays on `/create-events`:
 *
 * - `element_visible` → `impression` and `click` → `click`, only with a d1 `recommendation_id`, `search_result_id` or
 *   `product_listing_result_id` (the card's V4 `tracking_id`). V4 decodes the kind from the id, so the result
 *   field it came in doesn't matter. A v3 result id (from a v3 recommendation, say) stays on v3: V4 writes no row
 *   for an id it can't decode.
 * - `add_to_cart` → `add_to_cart`, with the d1 result id or a `product_id` (a PDP button).
 * - `page_view` → `product_view`, only on a PDP (`product_id` set). V4 has no plain page view.
 * - Anything else (`recommendations_inserted`, `purchase` on `/create-events`, errors) has no V4 type.
 *
 * Fields V4 has no place for are not sent: `tenant` (it's the path), `entity_price`, `currency` (outside purchase),
 * `document_width`, `attribution_id`, `click_location`, `ab_test_group`, `variant_ids`, `entity_identifiers`,
 * `recommendation_type`, `error_type`, `detail`.
 */
export function to_native_event(body: depict_body, ts: string): { merchant: string; event: NativeEvent } | undefined {
  const merchant = native_merchant(body.tenant);
  const base = native_base(body, ts);
  if (!merchant || !base) return undefined;
  const optional = (key: "url" | "referrer", value: unknown) =>
    typeof value === "string" && value ? { [key]: value } : {};
  const context = { ...optional("url", body.url), ...optional("referrer", body.document_referrer) };

  // The first result id set, as v3's intake reads it (resultIdOf in realtime): a v3 id there keeps the event on v3.
  const result_id = body.product_listing_result_id ?? body.recommendation_id ?? body.search_result_id;
  const tracking_id = native_tracking_id(result_id);
  const has_result_id = result_id != null;
  const product_id = non_empty(body.product_id, PRODUCT_ID_MAX) ? body.product_id : undefined;
  if (body.product_id != null && !product_id) return undefined;

  let event: NativeEvent;
  switch (body.type) {
    case "element_visible":
    case "click":
      if (!tracking_id) return undefined;
      event = { ...base, type: body.type === "click" ? "click" : "impression", tracking_id, ...context };
      break;
    case "add_to_cart":
      if (has_result_id ? !tracking_id : !product_id) return undefined;
      event = {
        ...base,
        type: "add_to_cart",
        ...(tracking_id ? { tracking_id } : {}),
        ...(product_id ? { product_id } : {}),
        ...context,
      };
      break;
    case "page_view":
      if (!product_id || (has_result_id && !tracking_id)) return undefined;
      event = { ...base, type: "product_view", product_id, ...(tracking_id ? { tracking_id } : {}), ...context };
      break;
    default:
      return undefined;
  }
  return { merchant, event };
}

/**
 * A native purchase event, or undefined when it would break the contract (then the caller keeps v3's
 * `/v2/create-events`).
 */
export function native_purchase_event(
  data: {
    event_id: string;
    market?: string;
    session_id?: string;
    transaction_id: string;
    currency: string;
    items: { sku: string; price: number; quantity: number }[];
  },
  ts: string
): NativeEvent | undefined {
  const base = native_base({ deduplication_id: data.event_id, market: data.market, session_id: data.session_id }, ts);
  if (!base || !non_empty(data.transaction_id, Infinity) || !CURRENCY.test(data.currency)) return undefined;
  const valid_items = data.items.every(
    item =>
      non_empty(item.sku, Infinity) &&
      typeof item.price === "number" &&
      Number.isFinite(item.price) &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0
  );
  if (!valid_items) return undefined;
  return {
    ...base,
    type: "purchase",
    purchase: {
      transaction_id: data.transaction_id,
      currency: data.currency,
      items: data.items.map(({ sku, price, quantity }) => ({ sku, price, quantity })),
    },
  };
}
