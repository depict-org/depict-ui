import { BaseProductListingConfig } from "@depict-ai/ui";
import { Display } from "@depict-ai/utilishared";
import { FC, ReactNode } from "react";

export interface PLPConfig<T extends Display> extends BaseProductListingConfig {
  /**
   * The product card to use for rendering products.
   */
  productCard: DepictProductCard<T>;
  /**
   * When set to true, filter options that wouldn't yield any results given the current filters are hidden.
   */
  hideCount0FilterOptions?: boolean;
  /**
   * Window max width (px) where filters are in a modal and not in a side-drawer.
   */
  switchToFiltersDrawerBreakpoint?: number | undefined;
}

/**
 * The Depict product card props.
 */
export interface DepictProductCardProps<T extends Display> {
  /** The display data to render. */
  display: T | null;
  /** The index of the product card. Please note that product cards may stay at the same place (not get re-rendered) or move around as the results change. */
  index: number;
}

/**
 * Depict product card to use for rendering products.
 */
export type DepictProductCard<T extends Display> = (props: DepictProductCardProps<T>) => ReactNode;

/**
 * The interface for a content block.
 * Please make sure that you don't have content blocks overlap as that will cause undefined behavior.
 * The height of the content block will be the height of the tallest item in a row, so if there are no products in a row the content block needs to "bring its own height".
 * If you need to load any data in the content block, please make sure to return a placeholder while you're doing so (see `ImagePlaceholder`), to avoid layout shifts and ensure scroll restoration works correctly.
 *
 * - `spanColumns`: How many columns the block should span. This will be capped to the number of columns available.
 * - `spanRows`: How many rows the block should span.
 * - `position`: Where the block should be positioned. Can be `left`, `center` or `right`.
 * - `content`: The content to render in the block - please provide a React component.
 */
export type ReactContentBlock = {
  spanColumns: number;
  spanRows: number;
  position: "left" | "center" | "right";
  content: FC;
};

/**
 * A sparse array containing content blocks to show (or an empty slot or undefined if there's no block at that index). See ReactContentBlock for how a content block looks like. The index is the row where the content block should be shown.
 * For example, to create a block on row 1 and 3 you'd do `[, block1, , block2]`.
 * Alternatively:
 * ```
 * const blocks = [];
 * blocks[1] = block1;
 * blocks[3] = block2;
 * ```
 */
export type ReactContentBlocksByRow = (undefined | ReactContentBlock)[];
