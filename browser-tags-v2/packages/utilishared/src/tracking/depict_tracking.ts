import { noisy_depict_payload, send_depict } from "./depict_transmission";
import { random_string } from "../utilities/random_string";
import { catchify as c, report } from "../logging/error";
import { Sentry } from "../logging/sentry_instance";
import { dlog } from "../logging/dlog";

export let get_session_id = () => {
  if (typeof document === "undefined") return "server";
  let id = "";
  let localstorage_error: Error;
  let cookie_error: Error;
  try {
    // localStorage._dep_id also accessed directly by depict-purchase-tracking Shopify web pixel
    id = localStorage._dep_id ||= random_string();
  } catch (e) {
    dlog("Can't use localStorage", e);
    localstorage_error = e;
  }
  if (!id) {
    try {
      const get_cookie_id = () =>
        (
          document.cookie.split(";").reduce((res, c) => {
            const [key, val] = c.trim().split("=").map(decodeURIComponent);
            return Object.assign(res, { [key]: val });
          }, {}) as { [key: string]: any }
        )._dep_id;
      id = get_cookie_id();
      if (!id) {
        document.cookie = `_dep_id=${random_string()}; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
        id = get_cookie_id();
      }
    } catch (e) {
      report(e, "warning");
      cookie_error = e;
    }
    Sentry.withScope(function (scope) {
      scope.setExtra("id", id);
      scope.setExtra("ls_error", localstorage_error);
      scope.setExtra("cookie_error", cookie_error);
      scope.setLevel("error");
      this.captureMessage(`${id ? "localStorage" : "cookie and localStorage"} failed to hold a value!`);
    });
  }
  if (!id) {
    id = random_string();
  }
  return id;
};

export const set_session_id_fn = /*@__PURE__*/ c((newfn: () => string) => (get_session_id = newfn));

export type TrackingEventContextData = {
  session_id: string;
  url: string;
  document_width: number;
  document_referrer: string;
};
export const get_tracking_event_context_data = /*@__PURE__*/ (): TrackingEventContextData => {
  return {
    session_id: get_session_id(),
    url: document.location.href,
    document_width: window.innerWidth,
    document_referrer: document?.referrer,
  };
};
/**
 * Sends a depict tracking event with prefilled data
 */
export const depict_prefilled = /*@__PURE__*/ c((vars: noisy_depict_payload[0], use_ws?: boolean) => {
  if (process.env.DEPICT === "false") {
    return;
  }
  const payload = [
    {
      ...get_tracking_event_context_data(),
      // Compatability mapping - TODO: refactor & remove
      tenant: vars?.TENANT,
      market: vars?.MARKET,
      entity_price: vars?.sale_price,
      ...vars,
    },
  ];
  return send_depict(payload, use_ws);
});

export const depict_click = /*@__PURE__*/ c((vars: noisy_depict_payload[0]) => {
  if (process.env.DEPICT === "false") {
    return;
  }
  const beacon_retval = depict_prefilled(
    {
      ...vars,
      type: "click",
    },
    false // don't send clicks over websockets because the page might unload
  );

  depict_prefilled(
    {
      ...vars,
      type: "ws_click",
    },
    true // explicitly send `ws-click` over websockets, this is an experiment to test the hypothesis of above - does unloading the page affect if this gets sent?
  );

  return beacon_retval;
});

export const depict_add_to_cart = /*@__PURE__*/ c((vars: noisy_depict_payload[0]) => {
  if (process.env.DEPICT === "false") {
    return;
  }
  return depict_prefilled({
    ...vars,
    type: "add_to_cart",
  });
});

export function get_cookie(cookie_name: string): string | undefined {
  // https://stackoverflow.com/a/25490531
  return document.cookie.match("(^|;)\\s*" + cookie_name + "\\s*=\\s*([^;]+)")?.pop() || "";
}
