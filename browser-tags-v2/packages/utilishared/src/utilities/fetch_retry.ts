import { serialize_object } from "./serializer";
import { wait } from "./wait";
import { catchify } from "../logging/error";
import { dlog } from "../logging/dlog";
import { Sentry } from "../logging/sentry_instance";

/**
 * Fetch with retry and exponential back off. This is the 2.0 version of the previous Windows proof fetch.
 *
 * Windows proof fetch is a utility which retries fetch requests 10 times when they fail. Reason for this is a certain windows 10 build where the network stack randomly breaks 20% of https connections
 * @param url Url to perform fetch towards
 * @param options Fetch options
 * @param max_retries Max number of retries, defaults to 10
 * @param useFetch_ The fetch function to use, defaults to the global fetch
 * @param initialRetryDuration_ The start duration for the first retry, defaults to 100ms
 * @returns The fetch response
 */
export async function fetch_retry(
  url: RequestInfo | URL,
  options?: RequestInit,
  max_retries = 10,
  { useFetch_ = fetch, initialRetryDuration_ = 100 }: { useFetch_?: typeof fetch; initialRetryDuration_?: number } = {}
) {
  const ONE_MINUTE = 60000;
  const max_backoff_ms = ONE_MINUTE;
  const { stack } = new Error();

  const calculate_retry = (delay: number) => {
    delay *= 2 + Math.random();
    if (delay > max_backoff_ms) {
      delay = max_backoff_ms * (1 + Math.random() / 10);
    }
    return delay;
  };

  let try_again_in_ms = initialRetryDuration_;
  let has_succeeded = false;
  let result: Response | boolean = false;

  while (max_retries && !has_succeeded) {
    try {
      const response = await useFetch_(url, options);
      const { status, ok } = response;
      if (!response || !ok || status !== 200) {
        if (status >= 400 && status < 500) {
          catchify(send_sentry_4xx)(response, options?.body || ({} as BodyInit), stack);
          has_succeeded = true;
        } else if (status === 404) {
          has_succeeded = true;
        }
        dlog("Response not ok", response);
      } else {
        has_succeeded = true;
      }
      result = response;
    } catch (error) {
      dlog("Error while fetching: ", error, url, options);

      // Don't retry CORS
      if (error.message.includes("CORS") && error.name.includes("CORS")) {
        has_succeeded = true;
      }
    } finally {
      if (!has_succeeded) {
        await wait(try_again_in_ms);
      }

      try_again_in_ms = calculate_retry(try_again_in_ms);
      max_retries -= 1;
    }
  }
  return result;
}

async function send_sentry_4xx(response: Response, body: BodyInit, stack: string | undefined) {
  if (process.env.TENANT === "shopify-config" && response.status === 403) {
    // Don't send requests in the shopify admin that say we need to re-authorize to sentry
    return;
  }
  const msg = `Validation error: got 4XX from API`;
  const text = await response.clone().text();
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
