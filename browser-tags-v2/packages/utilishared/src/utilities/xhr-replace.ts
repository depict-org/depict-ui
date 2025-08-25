import { err } from "../deprecated/err";
import { catchify } from "../logging/error";

/**
 * Proxies XMLHttpRequest.prototype.open to an open function which also calls the provided `fetch_handler` with useful information as parameter
 * @param  fetch_handler               A function which is catchified and which's return value is ignored. It gets called every time an XHR request gets opened
 * @return              void
 */
export function xhr_replace(
  fetch_handler: (
    request: XMLHttpRequest,
    method: "GET" | "POST",
    url: string | URL,
    arg_array: Parameters<typeof XMLHttpRequest.prototype.open>
  ) => void
) {
  fetch_handler = catchify(fetch_handler) as typeof fetch_handler;
  const { prototype } = XMLHttpRequest;
  prototype.open = new Proxy(prototype.open, {
    apply(target, this_arg, arg_array: Parameters<typeof XMLHttpRequest.prototype.open>) {
      if (Array.isArray(arg_array)) {
        const request = this_arg;
        const [method, url] = arg_array;
        catchify(fetch_handler)(request, method as "GET" | "POST", url, arg_array);
      }
      return target.apply(this_arg, arg_array);
    },
  });
}

/**
 * xhr_load uses xhr_replace but adds the provided handler as a "load" event listener to every XHR request instead of calling it on open
 * @param  handler               The function called on load of every XHR request.
 * @return         void
 */

export function xhr_load(
  handler: (
    request: XMLHttpRequest,
    method: "GET" | "POST",
    url: string | URL,
    event: ProgressEvent<XMLHttpRequestEventTarget>
  ) => any
) {
  xhr_replace((req, method, url) =>
    req.addEventListener(
      "load",
      catchify(event => handler(req, method, url, event))
    )
  );
}

export async function xhr_send_interceptor(
  send_callback: (
    request: XMLHttpRequest,
    open_args: Parameters<typeof XMLHttpRequest.prototype.open>,
    send_args: Parameters<typeof XMLHttpRequest.prototype.send>
  ) => any
) {
  const catchified_callback = catchify(send_callback);

  const requests = new WeakMap<XMLHttpRequest, Parameters<typeof XMLHttpRequest.prototype.open>>();

  xhr_replace((request, _method, _url, arg_array) => {
    requests.set(request, arg_array);
  });

  const { prototype } = XMLHttpRequest;
  prototype.send = new Proxy(prototype.send, {
    apply(target, this_request, arg_list) {
      try {
        if (requests.has(this_request)) {
          catchified_callback(
            this_request,
            requests.get(this_request)!,
            arg_list as Parameters<typeof XMLHttpRequest.prototype.send>
          );
        }
      } catch (e) {
        err(e);
      }
      return target.apply(this_request, arg_list);
    },
  });
}

/**
 * Intercepts someone reading `response`, `responseText` and `responseXML` on an XMLHttpRequest
 * @param  read_callback               Called everytime a response is read from an XMLHttpRequest which has been opened and sent - it doesn't have to have received a response yet so please keep in mind that you might have to pass through `undefined` if `orig_result` is `undefined`.
 */
export async function xhr_read_interceptor(
  read_callback: (
    request: XMLHttpRequest,
    open_args: Parameters<typeof XMLHttpRequest.prototype.open>,
    send_args: Parameters<typeof XMLHttpRequest.prototype.send>,
    orig_result: string | undefined,
    property_name: "responseText" | "response" | "responseXML"
  ) => string
) {
  const catchified_read_callback = catchify(read_callback);
  const open_send_arg_map = new WeakMap<
    XMLHttpRequest,
    [Parameters<typeof XMLHttpRequest.prototype.open>, Parameters<typeof XMLHttpRequest.prototype.send>]
  >();
  const { prototype } = XMLHttpRequest;
  const proxy_response = (n: "responseText" | "response" | "responseXML") => {
    const prev_desc = Object.getOwnPropertyDescriptor(prototype, n);
    const new_desc = {
      ...prev_desc,
      get: new Proxy(prev_desc!.get!, {
        apply(target, this_arg, arg_list) {
          const default_value = target.apply(this_arg, arg_list);
          try {
            const stored_args = open_send_arg_map.get(this_arg);
            if (!stored_args) {
              // request was sent before we proxied `.send`
              return default_value;
            }
            const [open_args, send_args] = stored_args;
            return catchified_read_callback(this_arg, open_args, send_args, default_value, n) || default_value;
          } catch (e) {
            // in case the weakmaps fail for some reason
            err(e);
            return default_value;
          }
        },
      }),
    };
    Object.defineProperty(prototype, n, new_desc);
  };

  xhr_send_interceptor((request, ...open_send_args) => open_send_arg_map.set(request, open_send_args));

  (["responseText", "response", "responseXML"] as const).forEach(proxy_response);
}
