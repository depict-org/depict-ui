import { DepictAPIWS } from "./strongwilled_ws_client";
import { random_string } from "../utilities/random_string";
import { catchify, report } from "../logging/error";
import { dlog } from "../logging/dlog";
import { Sentry } from "../logging/sentry_instance";
import { base_url } from "../constants";

export type event_types = "page_view" | "click" | "add_to_cart" | "purchase" | "element_visible";

const c = catchify;

const ws_instance = /*@__PURE__*/ c(() => new DepictAPIWS("wss://ws.depict.ai/ws/create-events"))();

const allowed_keys = [
  "tenant",
  "market",
  "type",
  "session_id",
  "product_id",
  "entity_identifiers",
  "url",
  "entity_price",
  "currency",
  "document_referrer",
  "document_width",
  "attribution_id",
  "recommendation_id",
  "click_location",
  "ab_test_group",
  "variant_ids",
  "transaction_id",
  "error_type",
  "detail",
  "recommendation_type",
  "search_result_id",
  "product_listing_result_id",
] as const;

export type depict_body = Partial<{
  [K in (typeof allowed_keys)[number]]: any;
}>;

export type depict_payload = depict_body[];

type any_properties = { [key: string]: any };
export type noisy_depict_payload = (depict_body & any_properties)[];

export const filter_depict_payload = /*@__PURE__*/ c((payload: noisy_depict_payload) => {
  if (process.env.DEPICT === "false") {
    return;
  }
  return payload.map(body =>
    Object.fromEntries(
      Object.entries(body).filter(
        ([key, value]) => (allowed_keys as unknown as string[]).includes(key) && value != null
      )
    )
  ) as depict_payload;
});

export const send_websocket = /*@__PURE__*/ c(async (bodies: depict_payload) => {
  if (process.env.DEPICT === "false") {
    return;
  }
  for (let i = 0; i < bodies.length; i++) {
    const id = random_string();
    ws_instance?.ensure_sent({ id, event: bodies[i] }).catch(e => report(e, "error"));
  }
});

export const send_depict_unfiltered = /*@__PURE__*/ c((payload: depict_payload, use_ws = true) => {
  if (process.env.DEPICT === "false") {
    return;
  }
  if (use_ws && typeof WebSocket == "function" && typeof ws_instance?.ensure_sent == "function") {
    dlog("Sending to depict (ws)", payload);
    return send_websocket(payload);
  }

  const url = base_url + "/create-events";

  return foolproof_send_beacon(url, payload);
});

export const foolproof_send_beacon = /*@__PURE__*/ c((url: string, payload: { [key: string]: any }) => {
  const payload_json = JSON.stringify(payload);
  let success = false;
  dlog(`Attempting to send (beacon)`, payload);
  try {
    success = navigator.sendBeacon(url, new Blob([payload_json], { type: "application/json" }));
  } catch (first_error) {
    dlog("Beacon has failed", first_error, "falling back to sending with wrong mime type which might work");
    try {
      success = navigator.sendBeacon(url, new Blob([payload_json], { type: "application/x-www-form-urlencoded" }));
    } catch (e) {
      dlog("Beacon fallback has failed", e, "trying fetch");
      fetch(url, {
        "headers": {
          "content-type": "application/json",
        },
        "body": payload_json,
        "method": "POST",
        "mode": "cors",
        "credentials": "include",
      })
        .then(response => response.text())
        .then(text => dlog("Beacon fallback fallback transmission result", text))
        .catch(fetch_error => {
          Sentry.withScope(function (scope) {
            scope.setExtra("stack", new Error().stack);
            scope.setExtra("url", url);
            scope.setExtra("payload", payload_json);
            scope.setExtra("first_error", first_error);
            scope.setExtra("second_error", e);
            scope.setTag("feature", "beacon");
            scope.setTag("approach", "fetch_fallback");
            scope.setLevel("error");
            this.captureMessage(fetch_error); // we can now do this - it's depict lazy sentry specific. `this` will refer to the actual hub with breadcrumbs and the scope activated
          });
        });
    }
  }
  return success;
});

export const send_depict = /*@__PURE__*/ c((payload: noisy_depict_payload, use_ws?: boolean) => {
  if (process.env.DEPICT === "false") {
    return;
  }
  // filter_depict_payload will only return undefined if process.env.DEPICT === "false"
  return send_depict_unfiltered(filter_depict_payload(payload)!, use_ws);
});
