import { dwarn, ModernDisplay } from "@depict-ai/utilishared";
import type { BrowseResponse, Product, RecommendationsRequest, RecommendationsResponse } from "./v4_types";
import { native_get_json, native_merchant_url } from "./http";
import { get_recommendation_types } from "./context";
import { read_recent_views, record_recent_view } from "./recent_views";
import {
  interleave_first_wins,
  recommendations_query_string,
  related_requests,
  to_native_recommendations_request,
  V3RecsInputs,
} from "./recommendations";
import { native_card_to_display } from "./cards";
import { browse_query_string, to_bcp47 } from "./responses";

/** realtime's related search page: the hits related recommendations anchor on and never repeat. */
const RELATED_SEARCH_PAGE = 100;

const get_recommendations = (merchant: string, request: RecommendationsRequest) =>
  native_get_json<RecommendationsResponse>(
    native_merchant_url(merchant, "/recommendations") + "?" + recommendations_query_string(request)
  );

const to_displays = (products: readonly Product[]) =>
  products.map(product => native_card_to_display(product, "recommendation_id"));

/**
 * fetchDepictRecommendations on the native V4 API (`/v4/{merchant}/recommendations`): the call's ids become the inputs
 * its surface reads (see to_native_recommendations_request), and the cards come back as v3 displays with their
 * `recommendation_id`, so display transformers and tracking work unchanged. Empty when V4 serves the merchant no such
 * type or the request fails.
 *
 * A product page's call (`productId`) records the product in the browser's view history once V4 resolves it, for
 * surfaces that read `recent_views`.
 */
export async function fetch_native_recommendations(
  call: V3RecsInputs & { merchant: string; locale?: string }
): Promise<ModernDisplay[]> {
  const { merchant } = call;
  const types = await get_recommendation_types(merchant);
  const inputs = types?.get(call.type);
  if (types && !inputs) {
    dwarn(`[NativeDepictAPI] V4 serves ${merchant} no recommendation type "${call.type}"; known:`, [...types.keys()]);
    return [];
  }
  const request = to_native_recommendations_request(
    { ...call, locale: to_bcp47(call.locale) },
    inputs,
    inputs?.includes("recent_views") ? read_recent_views(merchant) : []
  );
  if (!request) return [];
  const response = await get_recommendations(merchant, request);
  if (!response) return [];
  const anchor = response.used_inputs?.anchor;
  if (call.productId && anchor?.type === "product") record_recent_view(merchant, anchor.id);
  return to_displays(response.products);
}

/**
 * v3's search-related recommendations (`/v3/search/related`, the search page's recommendation rows) on the native V4
 * API. V4 has no surface that reads a query, so this does what v3's facade does: a search, then recommendations
 * anchored on its top hits (related_requests), merged. Undefined when it fails; empty when V4 serves the merchant
 * neither a `search` nor a `similar` surface.
 */
export async function fetch_native_related(call: {
  merchant: string;
  market: string;
  locale?: string;
  query?: string | null;
}): Promise<ModernDisplay[] | undefined> {
  const { merchant, market } = call;
  const types = await get_recommendation_types(merchant);
  if (!types) return undefined;
  const type = types.get("search")?.includes("anchor")
    ? "search"
    : types.get("similar")?.includes("anchor")
    ? "similar"
    : undefined;
  if (!type) {
    dwarn(`[NativeDepictAPI] V4 serves ${merchant} no search or similar recommendations for related products`);
    return [];
  }
  const locale = to_bcp47(call.locale);
  const query = call.query?.trim() || undefined;
  const searched = await native_get_json<BrowseResponse>(
    native_merchant_url(merchant, "/browse") +
      "?" +
      browse_query_string({
        market,
        ...(locale ? { locale } : {}),
        ...(query ? { query } : {}),
        limit: RELATED_SEARCH_PAGE,
      })
  );
  if (!searched) return undefined;
  const asked = related_requests(searched.products, { market, ...(locale ? { locale } : {}) }, type);
  if (!asked.length) return [];
  const answers = await Promise.all(asked.map(request => get_recommendations(merchant, request)));
  const lists = answers.filter((answer): answer is RecommendationsResponse => !!answer).map(answer => answer.products);
  if (!lists.length) return undefined;
  const products =
    lists.length > 1 ? interleave_first_wins(lists, Math.max(...lists.map(list => list.length))) : lists[0];
  return to_displays(products);
}
