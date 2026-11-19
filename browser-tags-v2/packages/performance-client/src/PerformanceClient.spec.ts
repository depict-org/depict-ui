const set_event_api = jest.fn();
const get_event_api = jest.fn(() => "v3");
const queue_native_events = jest.fn((_merchant: string, _events: unknown[]) => true as boolean | undefined);
const foolproof_send_beacon = jest.fn();
const native_purchase_event = jest.fn();

jest.mock(
  "@depict-ai/utilishared",
  () => ({
    base_url: "https://api.depict.ai",
    catchify: (fn: unknown) => fn,
    depict_click: jest.fn(),
    derror: jest.fn(),
    dlog: jest.fn(),
    foolproof_send_beacon,
    get_session_id: () => "session-1",
    get_tracking_event_context_data: () => ({
      session_id: "session-1",
      url: "u",
      document_width: 1,
      document_referrer: "",
    }),
    impression_track_element: jest.fn(),
    instant_exec_on_suspect_history_change: new Set(),
    observer: { onexists: jest.fn() },
    send_depict_unfiltered: jest.fn(),
    set_event_transport: jest.fn(),
    set_event_api,
    get_event_api,
    native_purchase_event: (...args: unknown[]) => native_purchase_event(...args),
    queue_native_events,
    random_string: () => "random",
  }),
  { virtual: true }
);
jest.mock("./setup_dpq", () => ({ setup_dpq: jest.fn() }));

import { PerformanceClient } from "./PerformanceClient";

const purchase = {
  transaction_id: "order-1",
  currency: "SEK",
  items: [{ item_id: "SKU-1", price: 99, quantity: 2 }],
};
const native_event = { event_id: "random", type: "purchase" };

function client(options = {}) {
  delete (globalThis as { depict?: unknown }).depict;
  return new PerformanceClient("depictcentra", { auto_observe: false, market: "se", ...options });
}

beforeEach(() => {
  jest.clearAllMocks();
  get_event_api.mockReturnValue("v3");
  queue_native_events.mockReturnValue(true);
  native_purchase_event.mockReturnValue(native_event);
});

it("sets the event API from the api option, and leaves it alone without one", () => {
  client();
  expect(set_event_api).not.toHaveBeenCalled();
  client({ api: "v4" });
  expect(set_event_api).toHaveBeenCalledWith("v4");
});

it("sends purchases to /v2/create-events on v3", () => {
  client().sendPurchaseEvent(purchase);
  expect(queue_native_events).not.toHaveBeenCalled();
  expect(foolproof_send_beacon).toHaveBeenCalledWith("https://api.depict.ai/v2/create-events", {
    tenant: "depictcentra",
    market: "se",
    events: [
      {
        event_type: "purchase",
        session_id: "session-1",
        transaction_id: "order-1",
        currency: "SEK",
        products: [{ sku: "SKU-1", price: 99, quantity: 2 }],
      },
    ],
  });
});

it("sends purchases as a native event on v4", () => {
  get_event_api.mockReturnValue("v4");
  client().sendPurchaseEvent(purchase);
  expect(native_purchase_event).toHaveBeenCalledWith(
    {
      event_id: "random",
      market: "se",
      session_id: "session-1",
      transaction_id: "order-1",
      currency: "SEK",
      items: [{ sku: "SKU-1", price: 99, quantity: 2 }],
    },
    expect.stringMatching(/Z$/)
  );
  expect(queue_native_events).toHaveBeenCalledWith("depictcentra", [native_event]);
  expect(foolproof_send_beacon).not.toHaveBeenCalled();
});

it.each([
  ["the contract can't take it", () => native_purchase_event.mockReturnValue(undefined)],
  ["V4 refuses the merchant", () => queue_native_events.mockReturnValue(false)],
])("keeps a purchase on v3 when %s", (_, arrange) => {
  get_event_api.mockReturnValue("v4");
  arrange();
  client().sendPurchaseEvent(purchase);
  expect(foolproof_send_beacon).toHaveBeenCalledTimes(1);
});
