import { base_url, dwarn, fetch_retry, report } from "@depict-ai/utilishared";
import type { ErrorResponse } from "./v4_types";

/** One try and at most two retries: a 503 burst from V4 shouldn't be multiplied by fetch_retry's default of 10. */
const NATIVE_MAX_TRIES = 3;

/** `https://api.depict.ai/v4/{merchant}{path}`. */
export function native_merchant_url(merchant: string, path: string) {
  return `${base_url}/v4/${encodeURIComponent(merchant)}${path}`;
}

/**
 * A GET on the native V4 API, decoded, or undefined when it failed. Reads are GETs without custom headers, so they are
 * simple CORS requests (V4's preflight allows only `content-type`). A 5xx is reported with V4's error code and request
 * id; fetch_retry already reports a 4xx with its body.
 */
export async function native_get_json<T>(url: string): Promise<T | undefined> {
  return (await native_get_answer<T>(url)).body_;
}

/** {@link native_get_json}'s GET, with V4's error (when it sent one) instead of undefined on a failure. */
export async function native_get_answer<T>(url: string): Promise<{ body_?: T; error_?: ErrorResponse["error"] }> {
  const response = await fetch_retry(url, { method: "GET" }, NATIVE_MAX_TRIES);
  if (!response) {
    dwarn("[NativeDepictAPI] no response from", url);
    return {};
  }
  if (response.status === 200) return { body_: (await response.json()) as T };
  let error: ErrorResponse["error"] | undefined;
  try {
    error = ((await response.json()) as ErrorResponse).error;
  } catch {
    // not V4's error body
  }
  dwarn("[NativeDepictAPI]", response.status, error?.code, error?.message, error?.request_id, url);
  if (response.status >= 500) {
    report([new Error(`V4 ${response.status} ${error?.code ?? ""}`), "Native V4 request failed"], "warning", {
      url,
      status: response.status,
      code: error?.code,
      request_id: error?.request_id ?? response.headers.get("x-depict-request-id"),
    });
  }
  return { error_: error };
}
