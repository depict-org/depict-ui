import { BaseProductListingConfig, ProductCardTemplate } from "@depict-ai/ui";
import { Display } from "@depict-ai/utilishared";

export interface PLPConfig<T extends Display> extends BaseProductListingConfig {
  /**
   * The product card function to use for rendering products.
   */
  productCard: ProductCardTemplate<T>;
}

export interface RecommendationRenderingConfig<T extends Display> extends BaseProductListingConfig {
  /**
   * A promise containing the recommendations to render, see https://docs.depict.ai/api-guide/recommendations/api-client/fetching
   */
  recommendations: Promise<T[]>;
  /**
   * The product card function to use for rendering products.
   */
  productCard: ProductCardTemplate<T>;
  /**
   * Optional title to show when recommendations are being shown
   */
  title?: string;
}

/**
 * The interface for a content block.
 * Please make sure that you don't have content blocks overlap as that will cause undefined behavior.
 * The height of the content block will be the height of the tallest item in a row, so if there are no products in a row the content block needs to "bring its own height".
 * If you need to load any data in the content block, please make sure to return a placeholder while you're doing so (see `ImagePlaceholder`), to avoid layout shifts and ensure scroll restoration works correctly.
 *
 * - `spanColumns`: How many columns the block should span. This will be capped to the number of columns available.
 * - `spanRows`: How many rows the block should span.
 * - `position`: Where the block should be positioned. Can be `left`, `center` or `right`.
 * - `content`: The content to render in the block - please provide a function returning one or multiple HTML elements.
 */
export type JSUIContentBlock = {
  spanColumns: number;
  spanRows: number;
  position: "left" | "center" | "right";
  content: () => HTMLElement;
};
/**
 * A sparse array containing content blocks to show (or an empty slot or undefined if there's no block at that index). See JSUIContentBlock for how a content block looks like. The index is the row where the content block should be shown.
 * For example, to create a block on row 1 and 3 you'd do `[, block1, , block2]`.
 * Alternatively:
 * ```
 * const blocks = [];
 * blocks[1] = block1;
 * blocks[3] = block2;
 * ```
 */
export type JSUIContentBlocksByRow = (undefined | JSUIContentBlock)[];
