import { ExclusiveId, fetchDepictRecommendations } from "@depict-ai/ui";
import { Display } from "@depict-ai/utilishared";

// Omit breaks the ExclusiveId fanciness and turns them all into | undefined. Putting them back in is an ugly workaround.
// The upside of not redefining everything from the start is we always catch any changes to the fetchDepictRecommendations signature.
export type FetchRecsOptions = Omit<
  Parameters<typeof fetchDepictRecommendations>[0],
  "merchant" | "market" | "sessionId" | "locale"
> &
  ExclusiveId;

export interface UseFetchRecommendationsReturn<T extends Display> {
  /**
   * Fetch recommendations from the Depict API.
   * @example
   * General recommendations for a landing page:
   * ```tsx
   * fetchRecommendations({ type: "landing_page" });
   * ```
   * @example
   * Fetch targeted recommendations for a product details page (PDP):
   * ```tsx
   * fetchRecommendations({ type: "related", productId: "t-shirt-white" })
   * ```
   * @returns {Promise<T[]>}
   */
  fetchRecommendations: (opts: FetchRecsOptions) => Promise<T[]>;
}
