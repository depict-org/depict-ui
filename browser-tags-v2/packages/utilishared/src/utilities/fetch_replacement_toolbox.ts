import { err } from "../deprecated/err";

/**
 * proxies window.fetch:
 * 1. Instead of window.fetch fetch_apply is called, target being the original fetch function
 * 2. fetch_proxy_handler is called and may read the request and return a (fake) response
 * 3. if fetch_proxy_handler fails the original target is called with the same this and arguments
 * We are meticulously preserving this, target and its arguments in case that someone replaces fetch with a function that does something else
 * I recognise that I could hardcode window and fetch but I DO NOT want any cases where this may break anything if I can avoid it
 * Remember to return response, else it will make another request
 * @param  fetch_proxy_handler               Called instead of the original fetch function everytime someone does fetch. Has to return a response.
 * @param unsafe_throw_up Whether to ignore above described safety features and just pass on precisely what the fetch_proxy_handler does. If you do this, make sure to CATCH ALL ERRORS of your logic in the fetch_proxy_handler and only throw if the original fetch throws
 * @return                     Nothing
 */
export async function fetch_replacer(
  fetch_proxy_handler: (
    target: typeof window.fetch,
    this_arg: typeof window,
    arguments_list: Parameters<typeof window.fetch>
  ) => Promise<Response | FakeResponse>,
  // we assume fetch is actually fetch, therefore proxy handler is typed like this
  unsafe_throw_up = false
) {
  window.fetch = new Proxy(window.fetch, { apply: fetch_apply }); // this is the magic

  async function fetch_apply(target: typeof window.fetch, this_arg: any, arguments_list: any) {
    // this wraps fetch_proxy_handler in case it fails
    // the types of the arguments of this function *should* be the same as for fetch_proxy_handler but are written as `any` because someone MIGHT replace fetch and they'd no longer be accurate
    if (unsafe_throw_up) {
      return await fetch_proxy_handler(target, this_arg, arguments_list);
    }
    return (
      (await fetch_proxy_handler(target, this_arg, arguments_list)?.catch?.(err)) ||
      (await target.apply(this_arg, arguments_list))
    );
  }
}

/**
 * This class extends and models the `Response` class as close as possible. Basically the only thing not being identical would be `instance_of_fake_response.constructor` and some other stuff, but nothing connected to how you're usually using a `Response` object.
 * Useful when wanting to change the result of a `fetch request`
 * Please see repo for usage examples
 * @param response_string   String to base Response object on
 * @param url               URL to claim that the Response is from
 * @param headers           Response headers
 * @param override_options  More options to pass to the `Response` constructor
 */
export class FakeResponse extends (globalThis?.Response || (class {} as typeof Response)) {
  // the or here is to not throw on node 16 on the server
  constructor(response_string: string, url: string, headers: HeadersInit = {}, override_options: ResponseInit = {}) {
    const options = {
      status: 200,
      statusText: "OK",
      headers: {
        "content-type": "application/json; charset=utf-8",
        ...headers,
      },
      ...override_options,
    };
    super(response_string, options);

    Object.defineProperty(this, "url", {
      value: url,
      configurable: true,
      enumerable: true,
    });
    Object.defineProperty(this, "type", {
      value: "basic",
      configurable: true,
      enumerable: true,
    });
  }
}
