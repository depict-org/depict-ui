import { describe, expect, test } from "@jest/globals";
import { remap_blocks_to_index, trailing_content_blocks } from "./create_content_blocks";

type Block = { span_columns: number; span_rows: number; position: "left" | "center" | "right"; content: string };

const block = (content: string, position: Block["position"] = "left", span = 1): Block => ({
  span_columns: span,
  span_rows: span,
  position,
  content,
});

/** Blocks by row, the way the listing API saves them, remapped for a grid with `cols` columns */
const trailing = (blocks_by_row: Record<number, Block>, cols: number, product_count: number) => {
  const wrapped_blocks_: (Block | undefined)[] = [];
  for (const [row, b] of Object.entries(blocks_by_row)) wrapped_blocks_[+row] = b;
  const remapped = remap_blocks_to_index({ wrapped_blocks_, n_cols_currently_showing_: cols });
  return trailing_content_blocks({ ...remapped, n_cols_currently_showing_: cols, product_count });
};

describe("trailing_content_blocks", () => {
  test("returns nothing when every block sits in front of a product", () => {
    expect(trailing({ 1: block("a"), 3: block("b") }, 4, 40)).toEqual([]);
  });

  test("returns the block in the right slot of a last row that isn't full (FOUND-206)", () => {
    // Luca Faloni, Brushed Cotton Shirts: 15 products in 4 columns, so the 4th row holds products 13-15 and the card
    // saved at row 3, right has no product after it
    expect(trailing({ 3: block("card", "right") }, 4, 15)).toEqual(["card"]);
    expect(trailing({ 3: block("card", "right") }, 4, 16)).toEqual([]);
  });

  test("returns a block in the last row even when blocks above take up cells", () => {
    // A 2x2 at the left of rows 0-1 leaves 2 product slots in each, so 11 products end in row 3: [p4 .. p7] row 2,
    // [p8 p9 p10 card] row 3
    expect(trailing({ 0: block("hero", "left", 2), 3: block("card", "right") }, 4, 11)).toEqual(["card"]);
    // With 12 products p11 takes that slot, so the card is in front of it and not trailing
    expect(trailing({ 0: block("hero", "left", 2), 3: block("card", "right") }, 4, 12)).toEqual([]);
  });

  test("keeps blocks in rows below the last product hidden, e.g. on a filtered listing", () => {
    // A 40 product category with cards at rows 2 and 5, filtered down to 3 products
    expect(trailing({ 2: block("a"), 5: block("b") }, 4, 3)).toEqual([]);
    // A card at the start of the row after a full last row has no product beside it either
    expect(trailing({ 1: block("a") }, 4, 4)).toEqual([]);
  });

  test("returns nothing without products or columns", () => {
    expect(trailing({ 0: block("a", "right") }, 4, 0)).toEqual([]);
    expect(
      trailing_content_blocks({
        content_blocks_by_index_: ["a"],
        row_by_index_: [0],
        displaced_products_: [],
        n_cols_currently_showing_: null,
        product_count: 1,
      })
    ).toEqual([]);
  });
});
