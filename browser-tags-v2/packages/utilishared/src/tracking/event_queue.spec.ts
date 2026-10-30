/** @jest-environment jsdom */

jest.mock("../logging/error", () => ({ ...jest.requireActual("../logging/error"), report: jest.fn() }));
jest.mock("../logging/dlog", () => ({ dlog: jest.fn(), dwarn: jest.fn() }));
jest.mock("../logging/sentry_instance", () => ({ Sentry: { withScope: jest.fn() } }));

let transmission: typeof import("./depict_transmission");
let tracking: typeof import("./depict_tracking");
let queue: typeof import("./event_queue");
let fetch_mock: jest.Mock;
let beacon_mock: jest.Mock;
let socket_mock: jest.Mock;
let socket_send: jest.SpyInstance;
let document_listeners: jest.SpyInstance;
let window_listeners: jest.SpyInstance;
const original_fetch = globalThis.fetch;
const original_socket = globalThis.WebSocket;
const original_env = process.env;

function visibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
}

function events(request = 0) {
  return JSON.parse(fetch_mock.mock.calls[request][1].body);
}

async function settle() {
  for (let i = 0; i < 6; i++) await Promise.resolve();
}

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers();
  process.env = { ...original_env, DEPICT: "true" };
  visibility("visible");
  fetch_mock = jest.fn().mockResolvedValue({ status: 200 });
  beacon_mock = jest.fn().mockReturnValue(true);
  socket_mock = jest.fn(() => ({ readyState: 1, addEventListener: jest.fn(), send: jest.fn() }));
  globalThis.fetch = fetch_mock;
  globalThis.WebSocket = socket_mock as unknown as typeof WebSocket;
  Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: beacon_mock });
  document_listeners = jest.spyOn(document, "addEventListener");
  window_listeners = jest.spyOn(window, "addEventListener");
  transmission = require("./depict_transmission");
  tracking = require("./depict_tracking");
  queue = require("./event_queue");
  const { DepictAPIWS } = require("./strongwilled_ws_client");
  socket_send = jest.spyOn(DepictAPIWS.prototype, "ensure_sent").mockResolvedValue([]);
});

afterEach(() => {
  for (const [event, listener] of document_listeners.mock.calls) document.removeEventListener(event, listener);
  for (const [event, listener] of window_listeners.mock.calls) window.removeEventListener(event, listener);
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
  globalThis.fetch = original_fetch;
  globalThis.WebSocket = original_socket;
  process.env = original_env;
});

it.each(["click", "add_to_cart", "page_view"])("sends %s immediately with keepalive and version params", type => {
  const { version_info } = require("../utilities/version_info");
  Object.assign(version_info, { utilishared: "1", dpc: "2", ui: "3" });
  expect(transmission.send_depict_unfiltered([{ type }])).toBe(true);
  expect(fetch_mock).toHaveBeenCalledTimes(1);
  const [url, options] = fetch_mock.mock.calls[0];
  expect(url).toBe("https://api.depict.ai/create-events?utilishared=1&dpc=2&ui=3");
  expect(options).toMatchObject({
    method: "POST",
    keepalive: true,
    credentials: "omit",
    headers: { "Content-Type": "text/plain" },
  });
  expect(events()).toEqual([{ type, deduplication_id: expect.any(String) }]);
});

it("batches impressions within 250 ms of the first event", () => {
  transmission.send_depict_unfiltered([{ type: "element_visible", recommendation_id: "first" }]);
  jest.advanceTimersByTime(200);
  transmission.send_depict_unfiltered([{ type: "element_visible", recommendation_id: "second" }]);
  jest.advanceTimersByTime(49);
  expect(fetch_mock).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1);
  expect(fetch_mock).toHaveBeenCalledTimes(1);
  expect(events().map(event => event.recommendation_id)).toEqual(["first", "second"]);
});

it.each(["click", "add_to_cart", "page_view"])("flushes queued impressions along with %s", type => {
  transmission.send_depict_unfiltered([{ type: "element_visible" }]);
  transmission.send_depict_unfiltered([{ type }]);
  expect(events().map(event => event.type)).toEqual(["element_visible", type]);
  jest.advanceTimersByTime(250);
  expect(fetch_mock).toHaveBeenCalledTimes(1);
});

it.each(["visibilitychange", "pagehide"])("flushes once on %s", event => {
  transmission.send_depict_unfiltered([{ type: "element_visible" }]);
  if (event === "visibilitychange") {
    document.dispatchEvent(new Event(event));
    expect(fetch_mock).not.toHaveBeenCalled();
    visibility("hidden");
    document.dispatchEvent(new Event(event));
  } else {
    window.dispatchEvent(new Event(event));
  }
  expect(fetch_mock).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(250);
  window.dispatchEvent(new Event("pagehide"));
  expect(fetch_mock).toHaveBeenCalledTimes(1);
});

it("sends impressions immediately when already hidden", () => {
  visibility("hidden");
  transmission.send_depict_unfiltered([{ type: "element_visible" }]);
  expect(fetch_mock).toHaveBeenCalledTimes(1);
});

it("splits UTF-8 bodies at 48 KiB and keeps event order", () => {
  const input = Array.from({ length: 7 }, (_, i) => ({
    type: "element_visible",
    detail: "😀".repeat(6000),
    product_id: String(i),
  }));
  transmission.send_depict_unfiltered(input);
  jest.advanceTimersByTime(250);
  expect(fetch_mock).toHaveBeenCalledTimes(4);
  for (const [, options] of fetch_mock.mock.calls) expect(new Blob([options.body]).size).toBeLessThanOrEqual(48 * 1024);
  expect(fetch_mock.mock.calls.flatMap((_, i) => events(i)).map(event => event.product_id)).toEqual(
    input.map(event => event.product_id)
  );
});

it("accepts exactly 48 KiB but rejects an indivisible oversized event", () => {
  const event = { type: "click", deduplication_id: "fixed", detail: "" };
  event.detail = "x".repeat(48 * 1024 - new Blob([JSON.stringify([event])]).size);
  expect(transmission.send_depict_unfiltered([event])).toBe(true);
  expect(new Blob([fetch_mock.mock.calls[0][1].body]).size).toBe(48 * 1024);
  expect(transmission.send_depict_unfiltered([{ ...event, detail: event.detail + "x" }, { type: "click" }])).toBe(
    false
  );
  expect(fetch_mock).toHaveBeenCalledTimes(2);
  expect(events(1)).toHaveLength(1);
  expect(require("../logging/error").report).toHaveBeenCalledWith(expect.any(Error), "warning", {
    bytes: 48 * 1024 - 1,
    type: "click",
  });
});

it("retries a 5xx only once with the same body and ids", async () => {
  fetch_mock.mockResolvedValue({ status: 503 });
  transmission.send_depict_unfiltered([{ type: "click" }]);
  await settle();
  expect(fetch_mock).toHaveBeenCalledTimes(2);
  expect(fetch_mock.mock.calls[1]).toEqual(fetch_mock.mock.calls[0]);
  expect(beacon_mock).not.toHaveBeenCalled();
});

it.each([400, 422, 429])("does not retry HTTP %s", async status => {
  fetch_mock.mockResolvedValue({ status });
  transmission.send_depict_unfiltered([{ type: "click" }]);
  await settle();
  expect(fetch_mock).toHaveBeenCalledTimes(1);
});

it("checks visibility when a failed response arrives", async () => {
  let respond: (value: { status: number }) => void;
  fetch_mock.mockImplementation(() => new Promise(resolve => (respond = resolve)));
  transmission.send_depict_unfiltered([{ type: "click" }]);
  visibility("hidden");
  respond!({ status: 503 });
  await settle();
  expect(fetch_mock).toHaveBeenCalledTimes(1);
});

it("retries a network rejection once while visible", async () => {
  fetch_mock.mockRejectedValueOnce(new TypeError("offline"));
  transmission.send_depict_unfiltered([{ type: "click" }]);
  await settle();
  expect(fetch_mock).toHaveBeenCalledTimes(2);
  expect(fetch_mock.mock.calls[1]).toEqual(fetch_mock.mock.calls[0]);
  expect(beacon_mock).not.toHaveBeenCalled();
});

it.each(["visible", "hidden"])("falls back to a text/plain beacon after network failure while %s", async state => {
  visibility(state as DocumentVisibilityState);
  fetch_mock.mockRejectedValue(new TypeError("offline"));
  transmission.send_depict_unfiltered([{ type: "click" }]);
  await settle();
  expect(fetch_mock).toHaveBeenCalledTimes(state === "visible" ? 2 : 1);
  expect(beacon_mock).toHaveBeenCalledTimes(1);
  const [url, blob] = beacon_mock.mock.calls[0];
  expect(url).toBe(fetch_mock.mock.calls[0][0]);
  expect(blob.type).toBe("text/plain");
  jest.useRealTimers();
  const text = await new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(blob);
  });
  expect(text).toBe(fetch_mock.mock.calls[0][1].body);
});

it("falls back immediately if fetch throws synchronously", () => {
  fetch_mock.mockImplementation(() => {
    throw new TypeError("keepalive unsupported");
  });
  transmission.send_depict_unfiltered([{ type: "click" }]);
  expect(fetch_mock).toHaveBeenCalledTimes(1);
  expect(beacon_mock).toHaveBeenCalledTimes(1);
});

it.each(["false", "throw"])("reports beacon failure (%s) without an unhandled rejection", async failure => {
  fetch_mock.mockRejectedValue(new TypeError("quota"));
  if (failure === "false") beacon_mock.mockReturnValue(false);
  else
    beacon_mock.mockImplementation(() => {
      throw new Error("quota");
    });
  transmission.send_depict_unfiltered([{ type: "click" }]);
  await settle();
  expect(require("../logging/error").report).toHaveBeenCalledWith(expect.any(Error), "warning");
});

it("does not construct a socket on import or through any default transport entry point", async () => {
  expect(socket_mock).not.toHaveBeenCalled();
  transmission.send_depict([{ type: "click" }], true);
  transmission.send_depict_unfiltered([{ type: "page_view" }], false);
  await transmission.send_websocket([{ type: "add_to_cart" }]);
  expect(fetch_mock).toHaveBeenCalledTimes(3);
  expect(socket_mock).not.toHaveBeenCalled();
});

it("constructs one canary socket lazily and uses identical event and envelope ids", () => {
  queue.set_event_transport("both");
  expect(socket_mock).not.toHaveBeenCalled();
  transmission.send_depict([{ type: "click", deduplication_id: "provided" }]);
  transmission.send_depict_unfiltered([{ type: "element_visible" }]);
  jest.advanceTimersByTime(250);
  expect(socket_mock).toHaveBeenCalledTimes(1);
  expect(socket_send).toHaveBeenCalledTimes(2);
  for (let i = 0; i < 2; i++)
    expect(socket_send.mock.calls[i][0]).toEqual({ id: events(i)[0].deduplication_id, event: events(i)[0] });
  expect(events()[0].deduplication_id).toBe("provided");
});

it("keeps HTTP working if the canary socket is unavailable or rejects", async () => {
  queue.set_event_transport("both");
  globalThis.WebSocket = undefined as unknown as typeof WebSocket;
  transmission.send_depict_unfiltered([{ type: "click" }]);
  expect(socket_mock).not.toHaveBeenCalled();
  globalThis.WebSocket = socket_mock as unknown as typeof WebSocket;
  socket_send.mockRejectedValue(new Error("socket failed"));
  transmission.send_depict_unfiltered([{ type: "page_view" }]);
  await settle();
  expect(fetch_mock).toHaveBeenCalledTimes(2);
});

it("stops socket sends after selecting http", () => {
  queue.set_event_transport("both");
  transmission.send_depict_unfiltered([{ type: "click" }]);
  queue.set_event_transport("http");
  transmission.send_depict_unfiltered([{ type: "click" }]);
  expect(socket_send).toHaveBeenCalledTimes(1);
  expect(fetch_mock).toHaveBeenCalledTimes(2);
});

it("sends exactly one click request in http mode", () => {
  tracking.depict_click({ tenant: "test", recommendation_id: "one" });
  expect(fetch_mock).toHaveBeenCalledTimes(1);
  expect(events()).toHaveLength(1);
  expect(events()[0].type).toBe("click");
  expect(socket_mock).not.toHaveBeenCalled();
  expect(beacon_mock).not.toHaveBeenCalled();
});

it("snapshots input without mutating it and retains filtering", () => {
  const input = { type: "element_visible", detail: { value: "before" }, ignored: "private" };
  transmission.send_depict([input]);
  input.detail.value = "after";
  jest.advanceTimersByTime(250);
  expect(events()[0]).toEqual({
    type: "element_visible",
    detail: { value: "before" },
    deduplication_id: expect.any(String),
  });
  expect(input).not.toHaveProperty("deduplication_id");
});

it("does not send or construct sockets when tracking is disabled", () => {
  process.env = { ...original_env, DEPICT: "false" };
  queue.set_event_transport("both");
  expect(transmission.send_depict_unfiltered([{ type: "click" }])).toBeUndefined();
  tracking.depict_click({});
  expect(fetch_mock).not.toHaveBeenCalled();
  expect(socket_mock).not.toHaveBeenCalled();
});
