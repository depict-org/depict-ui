/**
 * This module contains utillities for working with ecom sites using shoppify.
 *
 * Shopify cart API reference: https://shopify.dev/api/ajax/reference/cart
 */

import { deparallelize } from "../async_function_only_once";
import { fetch_replacer } from "../fetch_replacement_toolbox";
import { is_available_in } from "../variable_waiter";
import { catchify, report } from "../../logging/error";

export type ShopifyItem = {
  id: number;
  handle: string;
  quantity: number;
  url: string;
};

export type ShopifyError = {
  status: number;
  message: string;
  description: string;
};

/**
 * Represents a Shopify cart "event", i.e. Whenever a Shopify API request is sucessfull.
 * - `type` represent the type of event
 * - `response` resolves to a shopify response
 */
export type ShopifyEvent =
  | {
      // Requests made to the /cart.js endpoint
      type: "get_items";
      response: Promise<ShopifyItem[] | ShopifyError>;
      body?: object;
    }
  | {
      // Requests made to the /cart/add.js endpoint
      type: "add_items";
      response: Promise<ShopifyItem[] | ShopifyError>;
      body?: object;
    }
  | {
      // Requests made to the /cart/update.js endpoint
      type: "update_items";
      response: Promise<ShopifyItem[] | ShopifyError>;
      body?: object;
    }
  | {
      // Requests made to the /cart/change.js endpoint
      type: "change_items";
      response: Promise<ShopifyItem[] | ShopifyError>;
      body?: object;
    }
  | {
      // Requests made to the /cart/clear.js endpoint
      type: "clear_items";
      response: Promise<[] | ShopifyError>;
      body?: object;
    };

/**
 * Whenever any request to the shopify cart endpoint (this includes requests made by merchant code) is made {@link on_response} is called.
 *
 * ### Caveats
 * - This currently doesn't intercept XHR requests, only `fetch`. Interpecpting XHR should be implemented at some point!
 *
 * - Under the hood, this function works by proxying `window.fetch`. This isn't guaranted to work, and could even break merchant code.
 *  Call this function early on in the execution for the best possibillity of success.
 *
 * - If the merchant performs a `window.fetch` to Shopify before `intercept` then that response wont be intercepted.
 *   If you know that the merchant will make a request to Shopify early on then it might make sense to do something like:
 *   ```
 *   const handle = setTimeout(catchify(() => get_items_in_cart()), 2000)
 *   intercept(evt => {
 *       canel_timeout(handle)
 *       ...
 *   })
 *   ```
 *   In order to get the cart contents at some point even if you miss the merchants innitialt Shopify request.
 *
 * - `intercept` intercepts all requests to Shopify, including requests made by you.
 * @param lenient: If true, also new style endpoints not ending on .js will be intercepted.
 */
export function intercept(on_request: (event: ShopifyEvent) => any, lenient: boolean = false) {
  fetch_replacer(async (target, this_arg, argument_list) => {
    const response_promise = target.apply(this_arg, argument_list) as Promise<Response>;

    try {
      const input = argument_list[0];
      const url = input instanceof Request ? input.url : input instanceof URL ? input.href : input;

      // TODO, doing it like this doesn't feel very robust.
      // And what if the developer wants to override which url's corespond to which events?
      const url_segement_to_type = [
        ["/cart.js", "get_items"],
        ["/cart/add.js", "add_items"],
        ["/cart/update.js", "update_items"],
        ["/cart/change.js", "change_items"],
        ["/cart/clear.js", "clear_items"],
      ] as const;

      for (const [segment, type] of url_segement_to_type) {
        if (!url.includes(segment) && (!lenient || !url.endsWith(segment.split(".js")[0]))) {
          continue;
        }

        let decoded_body: object | undefined;
        try {
          const body = argument_list[1]?.body;
          if (typeof body === "string") {
            decoded_body = JSON.parse(body);
          }
        } catch (e) {}
        const body = decoded_body ? { body: decoded_body } : {};

        if (type === "clear_items") {
          on_request({
            type: "clear_items",
            response: response_promise.then(() => [] as []),
            ...body,
          });
        } else {
          on_request({
            type,
            ...body,
            response: response_promise.then(async response => {
              const response_copy = response.clone();

              // The raw untyped shopify response
              const json = (await response_copy.json()) as any;

              // There wasn't an `items` field, so we assume there was an error
              if (typeof json.items === "undefined") {
                return json as ShopifyError;
              }
              // There was an `items` field, so we assume that we succeeded
              else {
                return json.items as ShopifyItem[];
              }
            }),
          });
        }

        break;
      }
    } catch (e) {
      report([e, "error in shopify interception logic"], "warning");
    }

    return await response_promise;
  }, true);
}

export type AddToCartOptions = {
  quantity?: number;
};

/**
 * Add an item to the Shopify cart.
 *
 * ### Caveats
 * Keep in mind that adding to the shopify cart wont neccesarily update the merchants UI,
 * it only means that when the merchant fetches the cart again then they'll get the item added by you.
 * Usually the merchant has it's own global add-to-cart function that can be used. While doing that can
 * take more developer time it means that you usually get the merchant UI to update correctly.
 *
 * @param shopify_id
 * @param options.quantity How many of an item to add, defaults to `1`.
 * @throws If the response JSON is in an unexpected format.
 */
export async function add_item(shopify_id: string, options?: AddToCartOptions): Promise<ShopifyItem[] | ShopifyError> {
  const id = shopify_id;
  const quantity = options?.quantity ?? 1;
  const url = "/cart/add.js";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ id, quantity }],
    }),
  });

  const json = await response.json();

  if (Array.isArray(json.items)) {
    return json.items as ShopifyItem[];
  } else if (typeof json.status === "number") {
    return json as ShopifyError;
  } else {
    throw new Error(`Shopify ${url} did not respond as expected`);
  }
}

/**
 * Fetch the items in the shoppify cart.
 *
 * This is probably not the right function for mose use-cases.
 * Want to get notified when merchant code adds new items to the cart through Shopify?
 * Use {@link intercept} to intercept all calls to Shopify (even ones made by merchant code).
 *
 * @returns All items currently in the cart.
 * @throws If the response JSON is in an unexpected format.
 */
export async function get_items_in_cart(): Promise<ShopifyItem[] | ShopifyError> {
  const url = "/cart.js";

  const response = await fetch(url, { method: "GET" });

  const json = await response.json();

  if (Array.isArray(json.items)) {
    return json.items as ShopifyItem[];
  } else if (typeof json.status === "number") {
    return json as ShopifyError;
  } else {
    throw new Error(`Shopify ${url} did not respond as expected`);
  }
}

declare global {
  interface Window {
    ShopifyAnalytics: {
      meta?: {
        product?: ShopifyMetaProduct;
      };
    };
  }
}
interface ShopifyMetaProduct {
  id?: string;
  vendor?: string;
  variants?: {
    id?: string;
    sku?: string;
  }[];
}

/** Shopify sites often has an interesting meta object defined on window.ShopifyAnalytics.meta
 * The SKU that backend requires might only be found in the meta object.
 * This function gives you that object in a safe way that won't break Shopify.
 */
export const get_shopify_analytics_meta_product = /*@__PURE__*/ deparallelize(
  /*@__PURE__*/ catchify(async () => {
    const meta: (typeof window)["ShopifyAnalytics"]["meta"] = await is_available_in(window, "ShopifyAnalytics", "meta");
    return meta?.product;
  })
) as () => Promise<ShopifyMetaProduct | undefined>;
