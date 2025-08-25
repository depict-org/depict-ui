import { ProductCardType } from "./types";

export const a2c_selector = ".depict-add-to-cart";

export const product_card_tracking_id_attributes: Record<string, ProductCardType> = {
  // We sadly have customers in the wild using both _ and -
  "data-recommendation_id": ProductCardType.SnakeRecommendation,
  "data-recommendation-id": ProductCardType.Recommendation,
  // All of these product cards are Depict rendered via js or react ui, so we know the data attribute
  "data-search-result-id": ProductCardType.SearchResult,
  "data-product-listing-result-id": ProductCardType.ProductListingResult,
};
