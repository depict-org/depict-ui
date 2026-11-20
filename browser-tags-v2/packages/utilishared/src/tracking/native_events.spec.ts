import { native_purchase_event, NativeEvent, to_native_event } from "./native_events";

const TS = "2026-11-19T12:00:00.000Z";
const HEX = "0123456789abcdef0123456789abcdef";
const b64 = (text: string) => btoa(text).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
const SEARCH_ID = `d1.s.${HEX}.3.${b64("SKU-1")}`;
const LISTING_ID = `d1.l.${HEX}.0.${b64("SKU-1")}.${b64("listing-1")}`;
const RECS_ID = `d1.r.${HEX}.12.${b64("SKU-1")}.${b64("normal")}`;

/**
 * `Event` in realtime v4/types/schema/v4.schema.json (origin/main 4da87904): the keys a line may have, the required
 * ones, and the checks a value must pass. Every event the mapper emits must satisfy it.
 */
const CONTRACT_KEYS = [
  "event_id",
  "type",
  "market",
  "locale",
  "session_id",
  "ts",
  "product_id",
  "tracking_id",
  "query",
  "ab_variant",
  "url",
  "referrer",
  "purchase",
];
const REQUIRED = ["event_id", "type", "market", "session_id", "ts"];

function expect_contract(event: NativeEvent) {
  for (const key of Object.keys(event)) expect(CONTRACT_KEYS).toContain(key);
  for (const key of REQUIRED) expect(event).toHaveProperty(key);
  expect(["impression", "click", "add_to_cart", "product_view", "purchase"]).toContain(event.type);
  expect(event.event_id.length).toBeGreaterThanOrEqual(1);
  expect(event.event_id.length).toBeLessThanOrEqual(128);
  expect(event.session_id.length).toBeLessThanOrEqual(256);
  expect(event.ts).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(Z|[+-]\d\d:\d\d)$/);
  // The contract's refinements: purchase on, and only on, purchase; tracking_id on impression and click.
  expect(event.type === "purchase").toBe(event.purchase !== undefined);
  if (event.type === "impression" || event.type === "click") expect(event.tracking_id).toBeDefined();
  if (event.purchase) {
    expect(Object.keys(event.purchase).sort()).toEqual(["currency", "items", "transaction_id"]);
    for (const item of event.purchase.items) expect(Object.keys(item).sort()).toEqual(["price", "quantity", "sku"]);
  }
}

/** What DPC and utilishared put on every v3 event. */
const context = {
  deduplication_id: "abc123.x",
  tenant: "depictcentra",
  market: "se",
  session_id: "session-1",
  url: "https://shop.example/search?q=shirt",
  document_referrer: "https://shop.example/",
  document_width: 1280,
};

describe("to_native_event", () => {
  it.each([
    ["search_result_id", SEARCH_ID],
    ["product_listing_result_id", LISTING_ID],
    ["recommendation_id", RECS_ID],
  ])("maps a click with a d1 %s to a click carrying it as tracking_id", (key, id) => {
    const native = to_native_event({ ...context, type: "click", [key]: id, entity_price: 10 }, TS);
    expect(native).toEqual({
      merchant: "depictcentra",
      event: {
        event_id: "abc123.x",
        type: "click",
        market: "se",
        session_id: "session-1",
        ts: TS,
        tracking_id: id,
        url: context.url,
        referrer: context.document_referrer,
      },
    });
    expect_contract(native!.event);
  });

  it("maps an impression (element_visible) to an impression", () => {
    const native = to_native_event({ ...context, type: "element_visible", recommendation_id: RECS_ID }, TS);
    expect(native?.event).toMatchObject({ type: "impression", tracking_id: RECS_ID });
    expect_contract(native!.event);
  });

  it("maps a product card's add_to_cart to add_to_cart with the card's tracking_id", () => {
    const native = to_native_event({ ...context, type: "add_to_cart", search_result_id: SEARCH_ID }, TS);
    expect(native?.event).toMatchObject({ type: "add_to_cart", tracking_id: SEARCH_ID });
    expect(native?.event).not.toHaveProperty("product_id");
    expect_contract(native!.event);
  });

  it("maps a PDP add_to_cart to add_to_cart with product_id", () => {
    const native = to_native_event({ ...context, type: "add_to_cart", product_id: "SKU-9" }, TS);
    expect(native?.event).toMatchObject({ type: "add_to_cart", product_id: "SKU-9" });
    expect(native?.event).not.toHaveProperty("tracking_id");
    expect_contract(native!.event);
  });

  it("maps a PDP page_view to product_view", () => {
    const native = to_native_event({ ...context, type: "page_view", product_id: "SKU-9" }, TS);
    expect(native?.event).toMatchObject({
      type: "product_view",
      product_id: "SKU-9",
      referrer: context.document_referrer,
    });
    expect_contract(native!.event);
  });

  it("sends only contract keys, whatever the v3 body carries", () => {
    const native = to_native_event(
      {
        ...context,
        type: "click",
        search_result_id: SEARCH_ID,
        entity_price: 199,
        currency: "SEK",
        attribution_id: "a",
        click_location: "x",
        ab_test_group: "b",
        variant_ids: ["1"],
        recommendation_type: "normal",
        entity_identifiers: { product_id: "1" },
      },
      TS
    );
    expect(Object.keys(native!.event).sort()).toEqual(
      ["event_id", "type", "market", "session_id", "ts", "tracking_id", "url", "referrer"].sort()
    );
  });

  it.each<[string, Record<string, unknown>]>([
    ["a click with a v3 recommendation id", { type: "click", recommendation_id: "3f2a-v3-id" }],
    ["an impression with a v3 search id", { type: "element_visible", search_result_id: "v3-search-id" }],
    ["an add_to_cart with a v3 result id", { type: "add_to_cart", product_listing_result_id: "v3", product_id: "1" }],
    ["a click with no result id", { type: "click" }],
    ["an add_to_cart with neither id", { type: "add_to_cart" }],
    ["a page_view off a PDP", { type: "page_view" }],
    ["recommendations_inserted", { type: "recommendations_inserted", recommendation_type: "search" }],
    ["a /create-events purchase", { type: "purchase", transaction_id: "t" }],
    ["an unknown type", { type: "error", error_type: "x" }],
    ["no market", { type: "click", search_result_id: SEARCH_ID, market: undefined }],
    ["no session_id", { type: "click", search_result_id: SEARCH_ID, session_id: "" }],
    ["no tenant", { type: "click", search_result_id: SEARCH_ID, tenant: undefined }],
    ["a tenant V4 doesn't accept", { type: "click", search_result_id: SEARCH_ID, tenant: "Depict Centra" }],
    ["a numeric product_id", { type: "add_to_cart", product_id: 123 }],
    ["an overlong session_id", { type: "click", search_result_id: SEARCH_ID, session_id: "s".repeat(257) }],
    ["a malformed d1 id", { type: "click", search_result_id: `d1.s.${HEX}.03.${b64("SKU-1")}` }],
  ])("keeps %s on v3", (_, overrides) => {
    expect(to_native_event({ ...context, ...overrides }, TS)).toBeUndefined();
  });

  it("reads the result id in v3's order, so a v3 id first keeps the event on v3", () => {
    expect(
      to_native_event({ ...context, type: "click", product_listing_result_id: "v3", search_result_id: SEARCH_ID }, TS)
    ).toBeUndefined();
  });
});

describe("native_purchase_event", () => {
  const purchase = {
    event_id: "p1",
    market: "se",
    session_id: "session-1",
    transaction_id: "order-1",
    currency: "SEK",
    items: [{ sku: "SKU-1", price: 99.5, quantity: 2 }],
  };

  it("maps DPC's purchase to a native purchase event", () => {
    const event = native_purchase_event(purchase, TS);
    expect(event).toEqual({
      event_id: "p1",
      type: "purchase",
      market: "se",
      session_id: "session-1",
      ts: TS,
      purchase: { transaction_id: "order-1", currency: "SEK", items: [{ sku: "SKU-1", price: 99.5, quantity: 2 }] },
    });
    expect_contract(event!);
  });

  it.each<[string, Partial<typeof purchase>]>([
    ["a lowercase currency", { currency: "sek" }],
    ["a fractional quantity", { items: [{ sku: "SKU-1", price: 1, quantity: 1.5 }] }],
    ["an empty sku", { items: [{ sku: "", price: 1, quantity: 1 }] }],
    ["no market", { market: undefined }],
    ["no transaction id", { transaction_id: "" }],
  ])("leaves %s to v3", (_, overrides) => {
    expect(native_purchase_event({ ...purchase, ...overrides }, TS)).toBeUndefined();
  });
});
