import type { PerformanceClient } from "./PerformanceClient";

export enum ProductCardType {
  Recommendation,
  SnakeRecommendation,
  SearchResult,
  ProductListingResult,
}

export type TrackingKey = "recommendation_id" | "search_result_id" | "product_listing_result_id";

export const tracking_keys: Record<ProductCardType, TrackingKey> = {
  [ProductCardType.Recommendation]: "recommendation_id",
  [ProductCardType.SnakeRecommendation]: "recommendation_id",
  [ProductCardType.SearchResult]: "search_result_id",
  [ProductCardType.ProductListingResult]: "product_listing_result_id",
};

/**
 * The Depict Queue function used to register events to be sent to depict.
 */
export type DepictQueue = {
  (eventName: EventName, ...args: unknown[]): void;
  send_event?: (eventName: EventName, ...args: unknown[]) => void;
  queue: [EventName, unknown][];
};

/**
 * Depict Object containing everything depict-related on the page.
 */
export interface DepictObject {
  eventHistory: [EventName, unknown][];
  dpq: DepictQueue;
  dpc: PerformanceClient;
}

declare global {
  interface Window {
    /**
     * Lifted DPQ function for ease-of-use
     */
    dpq: DepictQueue;
    // @ts-ignore See 2h wasted in https://gitlab.com/depict-ai/depict.ai/-/merge_requests/7775/commits commit 3cff770d to 5dc31a85a65269e8b65dfce3150a8f3f440eb6fc
    depict: DepictObject;
  }
}

/**
 * Purchase format used by GA4 when sending a purchase event.
 * See https://developers.google.com/analytics/devguides/collection/ga4/ecommerce?client_type=gtag#make_a_purchase_or_issue_a_refund
 */
export interface GA4Purchase {
  transaction_id: string;
  currency: string;
  items: GA4PurchaseItem[];
  // Additional GA4 fields, not used by Depict
  [additional: string]: unknown;
}
/**
 * Product format used by GA4 when sending a purchase event.
 * See https://developers.google.com/analytics/devguides/collection/ga4/reference/events?client_type=gtag#purchase_item
 */
export interface GA4PurchaseItem {
  item_id: string;
  // Final unit price, including discounts.
  price: number;
  quantity: number;
  // Additional GA4 fields, not used by Depict
  [additional: string]: unknown;
}

export type EventName = "purchase" | "addToCart" | "setMarket" | "setProductId" | "setSessionId";
