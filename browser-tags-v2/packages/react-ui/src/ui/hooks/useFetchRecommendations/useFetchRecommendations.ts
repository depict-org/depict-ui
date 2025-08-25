import { fetchDepictRecommendations } from "@depict-ai/ui";
import { ModernDisplay } from "@depict-ai/utilishared";
import { globalState } from "../../../global_state";
import { FetchRecsOptions, UseFetchRecommendationsReturn } from "./useFetchRecommendations.types";
import { untrack } from "solid-js";

/**
 * Hook used to fetch Depict recommendations.
 * @example
 * Fetch general recommendations for a landing page:
 * ```tsx
 * import React from "react";
 * import { useFetchRecommendations } from "@depict-ai/react-ui";
 *
 * export const LandingPage = () => {
 *   const [recs, setRecs] = React.useState();
 *   const { fetchRecommendations } = useFetchRecommendations();
 *
 *   React.useEffect(() => {
 *     fetchRecommendations({ type: "landing_page" }).then(setRecs);
 *   }, [fetchRecommendations]);
 *
 *   return (
 *     <div>
 *      {recs?.map((display) => (
 *        <ProductCard display={display} />
 *      ))}
 *     </div>
 *   );
 * };
 * ```
 * @example
 * Fetch targeted recommendations for a product details page (PDP):
 * ```tsx
 * import React from "react";
 * import { useFetchRecommendations } from "@depict-ai/react-ui";
 *
 * export const ProductPage = ({ productId }) => {
 *   const [recs, setRecs] = React.useState();
 *   const { fetchRecommendations } = useFetchRecommendations();
 *
 *   React.useEffect(() => {
 *     fetchRecommendations({ type: "related", productId }).then(setRecs);
 *   }, [fetchRecommendations, productId]);
 *
 *   return (
 *     <div>
 *      {recs?.map((display) => (
 *        <ProductCard display={display} />
 *      ))}
 *     </div>
 *   );
 * };
 * ```
 * @returns {UseFetchRecommendationsReturn}
 */
export function useFetchRecommendations<T extends ModernDisplay>(): UseFetchRecommendationsReturn<T> {
  return {
    fetchRecommendations,
  };
}

async function fetchRecommendations<T extends ModernDisplay>(opts: FetchRecsOptions) {
  const {
    merchant: [get_merchant],
    market: [get_market],
    usedLocale: [get_usedLocale],
    sessionId: [get_sessionId],
  } = globalState;
  const merchant = untrack(get_merchant);
  const market = untrack(get_market);
  const locale = untrack(get_usedLocale).backend_locale_;
  if (!merchant || !market || !locale) {
    throw new Error(
      "Depict recommendations are not configured (merchant, market or locale is falsy). Wrap your app in a DepictProvider."
    );
  }

  const fetchedRecs = await fetchDepictRecommendations<T>({
    merchant,
    market,
    locale,
    sessionId: untrack(get_sessionId),
    ...opts,
  });

  const transformFunction = globalState.api?.display_transformers?.products;
  if (transformFunction) {
    return await transformFunction({
      merchant,
      market,
      locale,
      displays: fetchedRecs,
    });
  }

  return fetchedRecs;
}
