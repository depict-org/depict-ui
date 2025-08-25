import { catchify } from "../logging/error";
import { serialize_object } from "../utilities/serializer";
import { dlog } from "../logging/dlog";
import { Sentry } from "../logging/sentry_instance";

/**
 * @deprecated please use `fetch_retry()` instead
 *
 * Windows proof fetch factory: windows proof fetch is a utility which retries fetch requests 10 times when they fail. Reason for this is a certain windows 10 build where the network stack randomly breaks 20% of https connections
 * (Note: this thing really should be rewritten with exponential backoff and a better API)
 * @param  dlog                    logging function to use
 * @param  error_log               an array to which errors will be pushed
 * @return           a windows proof fetch function
 */
export default (dlog, error_log?: any[]) => {
  // https://sentry.io/organizations/depictai-0o/issues/2025371462/?project=5476183&query=is%3Aunresolved
  // https://stackoverflow.com/a/52947884
  const windows_proof_fetch = async function (
    url: RequestInfo,
    body: BodyInit,
    headers?: HeadersInit,
    decode_json?: boolean,
    fetch_options?: RequestInit,
    attempt?: number
  ) {
    attempt ||= 1;
    decode_json ??= true;

    const { stack } = new Error();

    const elog = (...args: any[]) => {
      if (Array.isArray(error_log)) {
        error_log.push(args);
      }
      return dlog(...args);
    };

    return await fetch(url, {
      ...(body ? { body } : {}),
      "method": "POST",
      ...(fetch_options ? fetch_options : {}),
      ...(headers ? { headers } : {}),
    })
      .then(async response => {
        if (!response || !response.ok || response.status !== 200) {
          if (response.status === 422) {
            catchify(send_sentry_422)(response, body, stack!);
          }
          elog("Response not ok", response);
          return false;
        } else {
          return await response[decode_json ? "json" : "text"]().catch(e => elog("error while decoding json", e));
        }
      })
      .catch(e => {
        elog("Error while fetching", e, url, body);
        if (
          (e.name == "TypeError" || e.message == "Failed to fetch" || e.message == "Network request failed") &&
          !e.message.includes("CORS") &&
          !e.name.includes("CORS") &&
          ++attempt! < 10
        ) {
          return windows_proof_fetch(url, body, headers, decode_json, fetch_options, attempt);
        }
        return false;
      });
  };
  return windows_proof_fetch;
};

async function send_sentry_422(response: Response, body: BodyInit, stack: string) {
  const msg = `Validation error: got 422 from API`;
  const text = await response.text();
  dlog(msg, "body", body, "response", response, "text", text, "stack", stack);
  Sentry.withScope(function (scope) {
    scope.setExtra("stack", stack);
    scope.setExtra("request_body", body);
    scope.setExtra("response", response);
    scope.setExtra("serialized_response", serialize_object(response));
    scope.setExtra("response_text", text);
    scope.setLevel("error");
    this.captureException(new Error(msg));
  });
}
