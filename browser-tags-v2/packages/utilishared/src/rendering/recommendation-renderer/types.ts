/**
 * Product properties that are used to render the product cards. Used until early 2023
 */
export interface LegacyDisplay {
  /**
   * The URL of the product page.
   */
  page_url: any;
  /**
   * The URL of the product image.
   */
  image_url: string;
  /** The price of the product. */
  sale_price: number;
  /** The original price of the product. */
  original_price: number;
  /** The product ID of the product. */
  product_id: string;
  /** The Google Analytics product ID */
  ga_product_id?: string;
  /** The Google Analytics product IDs */
  ga_product_ids?: string[];
  /** The variation IDs */
  variant_ids?: string[];
  /** The title */
  title: string;
  /** Unique recommendation result ID used by Depict */
  recommendation_id?: string;
  /** Unique search result ID used by Depict */
  search_result_id?: string;
  /** Unique product listing result ID used by Depict */
  product_listing_result_id?: string;
  [key: string]: any;
}

interface ModernDisplay {
  /**
   * The index of the variant to be displayed.
   */
  variant_index: number;
  /**
   * All variant displays (eg. different colors, sizes) of the product.
   */
  variant_displays: any[];
  /** Unique recommendation result ID used by Depict */
  recommendation_id?: string;
  /** Unique search result ID used by Depict */
  search_result_id?: string;
  /** Unique product listing result ID used by Depict */
  product_listing_result_id?: string;
  /** Recommendation type logic used by Depict */
  logic?: string;
}

/* Support for the current Spendrups display, which will probably be replaced by the ModernDisplay soon */
interface BasicDisplay {
  product_id: string;
  /** Unique recommendation result ID used by Depict */
  recommendation_id?: string;
  /** Unique search result ID used by Depict */
  search_result_id?: string;
  /** Unique product listing result ID used by Depict */
  product_listing_result_id?: string;
  /** Recommendation type logic used by Depict */
  logic?: string;
  [key: string]: any;
}

export type Display = LegacyDisplay | ModernDisplay | BasicDisplay;

export type Node_Iterable = HTMLCollection | NodeListOf<ChildNode> | Node_Array;

export type Node_Array = (Element | Text | Comment)[];

export type RecRendererResult<T extends Display> =
  | Record<string, never>
  | {
      elements: Node_Array;
      displays: T[];
    };
