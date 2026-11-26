import {
  add_version_query_params,
  base_url,
  dlog,
  dwarn,
  fetch_retry,
  get_session_id,
  ModernDisplay,
  snakeCasifyObject,
} from "@depict-ai/utilishared";
import { RecommendRequestV3 } from "@depict-ai/types/api/RecommendRequestV3";
import { RecommendResponseV3 } from "@depict-ai/types/api/RecommendResponseV3";
import type { DepictAPIVersion } from "../shared/native_v4/NativeDepictAPI";
import { fetch_native_recommendations } from "../shared/native_v4/fetch_native_recommendations";

export type ExclusiveId =
  | { categoryId: string; productId?: undefined; productIds?: undefined }
  | { categoryId?: undefined; productId: string; productIds?: undefined }
  | { categoryId?: undefined; productId?: undefined; productIds: string[] }
  | { categoryId?: undefined; productId?: undefined; productIds?: undefined };

type RecsAPIWrapperOptions = {
  type: string;
  merchant: string;
  market: string;
  locale: string;
  sessionId?: string;
  headers?: HeadersInit;
  metadata?: Record<string, any>;
  /**
   * Which Depict API to read: `"v3"` (the default) or `"v4"`, the native V4 API
   * (`https://api.depict.ai/v4/{merchant}/recommendations`). On V4, `sessionId`, `metadata` and `headers` aren't sent:
   * V4 content requests carry no session, and history-based recommendations get the shopper's recently viewed products
   * from the browser instead. Opt-in while V4 is rolled out.
   */
  api?: DepictAPIVersion;
} & ExclusiveId;

/**
 * Fetches recommendations from Depict's API.
 * ## It is important that you make the correct choice out of: no id, `categoryId`, `productId` and `productIds` (choose ONE) so read the documentation carefully.
 *
 * @param merchant The name of the merchant (e.g. "acme")
 * @param market The market to fetch recs for. Depict will provide this to you. (Example: "sv" or "sv-se".)
 * @param locale The locale to fetch for.
 * @param type The type of the recommendations, e.g. `front_page`, `after_basket, `related`, etc. Ask Depict for this.
 * @param productId When requesting recommendations for a single product, e.g. on a product detail page, pass the id of the product as `productId`.
 * @param productIds When requesting recommendations that should take multiple products into account, i.e. the contents of the basket/cart, pass an array of product ids as `productIds`
 * @param sessionId Optional unique identifier of the current session. Only necessary when performing server side requests to Depict.
 * @param metadata Custom metadata to be sent with each request to the Depict API. Only necessary if specifically instructed by Depict.
 * @param headers Optional headers to send to the Depict API. This could be authentication for example. 99% of integrations can leave this unset.
 * @param api Which Depict API to read: `"v3"` (the default) or `"v4"`, the native V4 API.
 * When no id is provided (none out of `categoryId`, `productId` and `productIds`) general recommendations will be fetched. This is for, for example, the frontpage where generally popular products get returned.
 *
 * @note If you only get recommendations when specifying the wrong id type (i.e. you only get basket recommendations if you provide a single product id while the recommendations should be based on everything in the basket) please ask Depict to re-configure the endpoint for you.
 *
 *  @example Fetching frontpage recommendations
 * ```
 * const front_page_recs = await fetchDepictRecommendations({
 *     merchant: "oscarjacobson",
 *     market: "sv-se",
 *     type: "front_page",
 *   });
 * ```
 * @example Fetching recommendations for a product page
 * ```
 *  const product_page_recs = await fetchDepictRecommendations({
 *     merchant: "stronger",
 *     market: "se",
 *     type: "product_normal",
 *     productId: "hero-sports-bra-luna",
 *   });
 * ```
 * @return This function is guaranteed to return an array of Displays. If anything fails, you will get an empty array.
 */
export async function fetchDepictRecommendations<T extends ModernDisplay = ModernDisplay>(
  options: RecsAPIWrapperOptions
): Promise<T[]> {
  if (options.api === "v4") return (await fetch_native(options)) as T[];
  const headers = options.headers;
  const product_id = options.productId || (options as any).product_id; // Second fallback here is just because there was very little missing to make this work with snake_case input and in case someone puts in snake case'd stuff already (preview browser did) we can easily not break it
  const cleaned_up_options = snakeCasifyObject(
    options as Omit<RecsAPIWrapperOptions, "headers"> & { headers?: HeadersInit }
  );
  delete cleaned_up_options.headers;
  delete cleaned_up_options.product_id;
  delete cleaned_up_options.api;
  cleaned_up_options.session_id ||= get_session_id();
  if (product_id && !cleaned_up_options.product_ids) {
    cleaned_up_options.product_ids = [product_id];
  }

  const options_to_send = cleaned_up_options as RecommendRequestV3;
  const url = add_version_query_params(`${base_url}/v3/recommend/products`);

  return await fetch_retry(url, {
    body: JSON.stringify(options_to_send),
    ...(headers ? { headers } : {}),
    method: "POST",
  })
    .catch(e => dlog("fetch_retry threw", e))
    .then(async maybe_response => {
      if (!maybe_response) return [];
      let decoded: RecommendResponseV3 | undefined;
      try {
        decoded = (await maybe_response.json()) as RecommendResponseV3;
      } catch (e) {
        dlog("Failed to decode JSON", e);
      }
      return (decoded?.displays || []) as unknown as T[];
    });
}

async function fetch_native(options: RecsAPIWrapperOptions) {
  const { merchant, market, locale, type, headers, categoryId, productIds } = options;
  if (headers) dwarn("fetchDepictRecommendations: headers aren't sent to the native V4 API", headers);
  try {
    return await fetch_native_recommendations({
      merchant,
      market,
      locale,
      type,
      categoryId,
      productId: options.productId || (options as any).product_id,
      productIds,
      limit: (options as { limit?: number }).limit,
    });
  } catch (e) {
    dlog("fetch_native_recommendations threw", e);
    return [];
  }
}
