import type { depict_payload } from "./depict_transmission";
import { DepictAPIWS } from "./strongwilled_ws_client";
import { EventApi, NativeEvent, native_merchant, to_native_event } from "./native_events";
import { base_url } from "../constants";
import { catchify, report } from "../logging/error";
import { random_string } from "../utilities/random_string";
import { add_version_query_params } from "../utilities/version_info";

/** HTTP is the default; both also sends identical events over a canary socket. */
export type EventTransport = "http" | "both";

const MAX_BODY_BYTES = 48 * 1024;
const IMPRESSION_DELAY_MS = 250;
let transport: EventTransport = "http";
let event_api: EventApi = "v3";
let socket: DepictAPIWS | undefined;
let flush_timer: ReturnType<typeof setTimeout> | undefined;
let listening = false;

/**
 * Queued events per endpoint. v3's `/create-events` takes a JSON array; V4's `/v4/{merchant}/events` takes NDJSON.
 * Both bodies are the events joined by one separator byte, plus v3's two brackets.
 */
type Batch = { events: string[]; bytes: number; ndjson: boolean };
const batches = new Map<string, Batch>();

/** Configure before tracking starts; shared by users of this utilishared module.
 * Switching to http stops new socket sends but leaves an existing canary socket open.
 */
export function set_event_transport(value: EventTransport) {
  transport = value === "both" ? "both" : "http";
}

/**
 * Configure before tracking starts; shared by users of this utilishared module. `v4` sends each event the native
 * events contract can carry to `/v4/{merchant}/events` instead of `/create-events` (see `to_native_event`); `v3`
 * (the default) sends everything to `/create-events`.
 */
export function set_event_api(value: EventApi) {
  event_api = value === "v4" ? "v4" : "v3";
}

export function get_event_api(): EventApi {
  return event_api;
}

function send_beacon(url: string, body: string) {
  try {
    if (!navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }))) {
      report(new Error("Event beacon was not queued"), "warning");
    }
  } catch (error) {
    report(error, "warning");
  }
}

/** V4 answers 200 even when it rejects lines; a rejected line is an event the contract no longer takes. */
function check_native_response(response: Response, url: string) {
  if (response.status !== 200 || typeof response.json !== "function") return;
  response
    .json()
    .then((body: { rejected?: number; request_id?: string }) => {
      if (body?.rejected) {
        report(new Error("V4 rejected tracking events"), "warning", { url, ...body });
      }
    })
    .catch(() => {});
}

function send_batch(url: string, body: string, retried = false, native = false) {
  let request: Promise<Response>;
  try {
    request = fetch(url, {
      method: "POST",
      keepalive: true,
      credentials: "omit",
      headers: { "Content-Type": "text/plain" },
      body,
    });
  } catch {
    send_beacon(url, body);
    return;
  }
  request
    .then(
      response => {
        if (response.status >= 500 && !retried && document.visibilityState === "visible") {
          send_batch(url, body, true, native);
        } else if (native) {
          check_native_response(response, url);
        }
      },
      () => {
        if (!retried && document.visibilityState === "visible") {
          send_batch(url, body, true, native);
        } else {
          send_beacon(url, body);
        }
      }
    )
    .catch(error => report(error, "warning"));
}

function flush_batch(url: string) {
  const batch = batches.get(url);
  if (!batch) return;
  batches.delete(url);
  send_batch(url, batch.ndjson ? batch.events.join("\n") : `[${batch.events.join(",")}]`, false, batch.ndjson);
}

const flush = /*@__PURE__*/ catchify(() => {
  clearTimeout(flush_timer);
  flush_timer = undefined;
  for (const url of [...batches.keys()]) flush_batch(url);
});

const v3_url = () => String(add_version_query_params(base_url + "/create-events"));
const v4_url = (merchant: string) =>
  String(add_version_query_params(`${base_url}/v4/${encodeURIComponent(merchant)}/events`));

function listen() {
  if (listening) return;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
  listening = true;
}

/** Adds one serialized event to its endpoint's batch, sending the batch first if the event wouldn't fit. */
function enqueue(url: string, json: string, ndjson: boolean, type: unknown): boolean {
  const bytes = new Blob([json]).size;
  const empty_bytes = ndjson ? 0 : 2;
  if (bytes + empty_bytes > MAX_BODY_BYTES) {
    report(new Error("Event exceeds the keepalive body limit"), "warning", { bytes, type });
    return false;
  }
  let batch = batches.get(url);
  if (batch && batch.bytes + bytes + 1 > MAX_BODY_BYTES) {
    flush_batch(url);
    batch = undefined;
  }
  if (!batch) batches.set(url, (batch = { events: [], bytes: empty_bytes, ndjson }));
  batch.bytes += bytes + (batch.events.length ? 1 : 0);
  batch.events.push(json);
  return true;
}

function schedule(immediate: boolean) {
  if (immediate) {
    flush();
  } else if (batches.size && flush_timer === undefined) {
    flush_timer = setTimeout(flush, IMPRESSION_DELAY_MS);
  }
}

const send_canary = /*@__PURE__*/ catchify(
  (json: string) => {
    if (typeof WebSocket !== "function") return;
    socket ||= new DepictAPIWS("wss://ws.depict.ai/ws/create-events");
    const event = JSON.parse(json);
    socket.ensure_sent({ id: event.deduplication_id, event }).catch(error => report(error, "warning"));
  },
  undefined,
  "warning"
);

export function queue_events(payload: depict_payload) {
  if (process.env.DEPICT === "false" || typeof document === "undefined") return;
  listen();

  let accepted = true;
  let immediate = document.visibilityState === "hidden";
  const ts = new Date().toISOString();
  for (const raw of payload) {
    const event = { ...raw, deduplication_id: raw.deduplication_id || random_string() };
    const native = event_api === "v4" ? to_native_event(event, ts) : undefined;
    const json = JSON.stringify(native ? native.event : event);
    const queued = native
      ? enqueue(v4_url(native.merchant), json, true, event.type)
      : enqueue(v3_url(), json, false, event.type);
    if (!queued) {
      accepted = false;
      continue;
    }
    immediate ||= event.type !== "element_visible";
    // The canary socket is v3's; an event sent to V4 isn't mirrored there.
    if (transport === "both" && !native) send_canary(json);
  }

  schedule(immediate);
  return accepted;
}

/**
 * Sends native V4 events for `merchant` right away (with whatever else is queued), with the same retries and
 * beacon fallback as v3 events. Returns false if the merchant isn't one V4 accepts or an event is too large.
 */
export function queue_native_events(merchant: string, events: NativeEvent[]) {
  if (process.env.DEPICT === "false" || typeof document === "undefined") return;
  const path_merchant = native_merchant(merchant);
  if (!path_merchant) return false;
  listen();
  let accepted = true;
  for (const event of events) {
    accepted = enqueue(v4_url(path_merchant), JSON.stringify(event), true, event.type) && accepted;
  }
  schedule(true);
  return accepted;
}
