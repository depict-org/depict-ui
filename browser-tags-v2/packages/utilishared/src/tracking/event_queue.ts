import type { depict_payload } from "./depict_transmission";
import { DepictAPIWS } from "./strongwilled_ws_client";
import { base_url } from "../constants";
import { catchify, report } from "../logging/error";
import { random_string } from "../utilities/random_string";
import { add_version_query_params } from "../utilities/version_info";

/** HTTP is the default; both also sends identical events over a canary socket. */
export type EventTransport = "http" | "both";

const MAX_BODY_BYTES = 48 * 1024;
const IMPRESSION_DELAY_MS = 250;
let transport: EventTransport = "http";
let socket: DepictAPIWS | undefined;
let queued_events: string[] = [];
let queued_bytes = 2;
let flush_timer: ReturnType<typeof setTimeout> | undefined;
let listening = false;

/** Configure before tracking starts; shared by users of this utilishared module.
 * Switching to http stops new socket sends but leaves an existing canary socket open.
 */
export function set_event_transport(value: EventTransport) {
  transport = value === "both" ? "both" : "http";
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

function send_batch(url: string, body: string, retried = false) {
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
          send_batch(url, body, true);
        }
      },
      () => {
        if (!retried && document.visibilityState === "visible") {
          send_batch(url, body, true);
        } else {
          send_beacon(url, body);
        }
      }
    )
    .catch(error => report(error, "warning"));
}

const flush = /*@__PURE__*/ catchify(() => {
  clearTimeout(flush_timer);
  flush_timer = undefined;
  if (!queued_events.length) return;
  const body = `[${queued_events.join(",")}]`;
  queued_events = [];
  queued_bytes = 2;
  send_batch(String(add_version_query_params(base_url + "/create-events")), body);
});

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
  if (!listening) {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
    window.addEventListener("pagehide", flush);
    listening = true;
  }

  let accepted = true;
  let immediate = document.visibilityState === "hidden";
  for (const event of payload) {
    const json = JSON.stringify({ ...event, deduplication_id: event.deduplication_id || random_string() });
    const bytes = new Blob([json]).size;
    if (bytes + 2 > MAX_BODY_BYTES) {
      report(new Error("Event exceeds the keepalive body limit"), "warning", { bytes, type: event.type });
      accepted = false;
      continue;
    }
    if (queued_bytes + bytes + (queued_events.length ? 1 : 0) > MAX_BODY_BYTES) flush();
    queued_bytes += bytes + (queued_events.length ? 1 : 0);
    queued_events.push(json);
    immediate ||= event.type !== "element_visible";
    if (transport === "both") send_canary(json);
  }

  if (immediate) {
    flush();
  } else if (queued_events.length && flush_timer === undefined) {
    flush_timer = setTimeout(flush, IMPRESSION_DELAY_MS);
  }
  return accepted;
}
