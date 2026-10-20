import { createRoot } from "solid-js";
import { describe, expect, jest, test } from "@jest/globals";
import { ColsAtSize } from "@depict-ai/utilishared";
import { get_cols_currently_showing } from "../../helper_functions/get_cols_currently_showing";
import {
  get_content_block_row_styles,
  get_final_content_block_spans,
  remap_blocks_to_index,
  trailing_content_blocks,
} from "./create_content_blocks";

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

  test.each([
    { row: 1, product_count: 5, expected_index: 4 },
    { row: 3, product_count: 13, expected_index: 12 },
  ])("keeps a left 2x2 card at index $expected_index for row $row", ({ row, product_count, expected_index }) => {
    const wrapped_blocks_: (Block | undefined)[] = [];
    wrapped_blocks_[row] = block("card", "left", 2);
    const remapped = remap_blocks_to_index({ wrapped_blocks_, n_cols_currently_showing_: 4 });

    expect(remapped.content_blocks_by_index_[expected_index]).toBe("card");
    expect(remapped.content_blocks_by_index_).toHaveLength(expected_index + 1);
    expect(
      trailing_content_blocks({
        ...remapped,
        n_cols_currently_showing_: 4,
        product_count,
      })
    ).toEqual([]);
  });

  test("keeps the card inline when the product count grows from four to five", () => {
    const blocks: (Block | undefined)[] = [];
    blocks[1] = block("card", "left", 2);
    const remapped = remap_blocks_to_index({ wrapped_blocks_: blocks, n_cols_currently_showing_: 4 });

    expect(trailing_content_blocks({ ...remapped, n_cols_currently_showing_: 4, product_count: 4 })).toEqual(["card"]);
    expect(trailing_content_blocks({ ...remapped, n_cols_currently_showing_: 4, product_count: 5 })).toEqual([]);
    expect(remapped.content_blocks_by_index_[4]).toBe("card");
  });

  test("puts the API's centered 2x2 card after five products at four columns", () => {
    const blocks: (Block | undefined)[] = [];
    blocks[1] = block("card", "center", 2);
    const remapped = remap_blocks_to_index({ wrapped_blocks_: blocks, n_cols_currently_showing_: 4 });
    expect(remapped.content_blocks_by_index_[5]).toBe("card");
    expect(trailing_content_blocks({ ...remapped, n_cols_currently_showing_: 4, product_count: 5 })).toEqual(["card"]);
  });

  test("does not move a 2x2 card to the trailing list when its span extends past five products", () => {
    const blocks: (Block | undefined)[] = [];
    blocks[1] = block("card", "left", 2);
    const remapped = remap_blocks_to_index({ wrapped_blocks_: blocks, n_cols_currently_showing_: 4 });
    const card_index = remapped.content_blocks_by_index_.indexOf("card");

    expect(card_index + 2 * 4).toBeGreaterThan(5);
    expect(card_index).toBe(4);
    expect(trailing_content_blocks({ ...remapped, n_cols_currently_showing_: 4, product_count: 5 })).toEqual([]);
  });

  test("uses the active grid breakpoint count when it remaps a card", () => {
    const original_match_media = window.matchMedia;
    const original_inner_width = window.innerWidth;
    const match_media = jest.fn((query: string) => {
      const min_width = Number(query.match(/min-width:\s*(\d+)px/)?.[1] || 0);
      const max_width = Number(query.match(/max-width:\s*(\d+)px/)?.[1] || Infinity);
      const matches = window.innerWidth >= min_width && window.innerWidth <= max_width;
      return {
        matches,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(() => true),
      } as unknown as MediaQueryList;
    });
    Object.defineProperty(window, "matchMedia", { configurable: true, value: match_media });

    try {
      const cols_at_size: ColsAtSize = [
        [2, "0px", "901px"],
        [3, "902px", "1024px"],
        [4, "1025px", ""],
      ];
      for (const [width, expected_cols, expected_index] of [
        [900, 2, 2],
        [1000, 3, 3],
        [1728, 4, 4],
      ]) {
        window.innerWidth = width;
        createRoot(dispose => {
          const active_cols = get_cols_currently_showing(() => cols_at_size)();
          const blocks: (Block | undefined)[] = [];
          blocks[1] = block("card", "left", 2);
          const remapped = remap_blocks_to_index({
            wrapped_blocks_: blocks,
            n_cols_currently_showing_: active_cols,
          });

          expect(active_cols).toBe(expected_cols);
          expect(remapped.content_blocks_by_index_[expected_index]).toBe("card");
          expect(remapped.content_blocks_by_index_[5]).toBeUndefined();
          expect(
            trailing_content_blocks({ ...remapped, n_cols_currently_showing_: active_cols, product_count: 5 })
          ).toEqual([]);
          dispose();
        });
      }
    } finally {
      window.innerWidth = original_inner_width;
      Object.defineProperty(window, "matchMedia", { configurable: true, value: original_match_media });
    }
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
  });

  test("renders a card in the first row after a full last product row", () => {
    // Luca Faloni, Oxford Cotton Shirts: four products fill row 0; the row 1 card must follow them.
    expect(trailing({ 1: block("card") }, 4, 4)).toEqual(["card"]);
    // A row 2 card is still beyond the short listing and stays hidden.
    expect(trailing({ 2: block("later") }, 4, 4)).toEqual([]);
  });

  test("does not pull a card forward when the last product row is partial", () => {
    // Five products leave three product slots open in row 1, so a row 2 card must stay hidden.
    expect(trailing({ 2: block("card") }, 4, 5)).toEqual([]);
  });

  test("caps full-width blocks to one row and keeps partial-width row spans", () => {
    expect(get_final_content_block_spans({ span_columns: 4, span_rows: 2 }, 4)).toEqual({
      span_columns: 4,
      span_rows: 1,
      spans_whole_row: true,
      spans_multiple_rows: false,
    });
    expect(get_final_content_block_spans({ span_columns: 2, span_rows: 2 }, 4)).toEqual({
      span_columns: 2,
      span_rows: 2,
      spans_whole_row: false,
      spans_multiple_rows: true,
    });
    expect(get_final_content_block_spans({ span_columns: 2, span_rows: 1 }, 4)).toEqual({
      span_columns: 2,
      span_rows: 1,
      spans_whole_row: false,
      spans_multiple_rows: false,
    });
    expect(get_final_content_block_spans({ span_columns: 6, span_rows: 3 }, 4)).toEqual({
      span_columns: 4,
      span_rows: 1,
      spans_whole_row: true,
      spans_multiple_rows: false,
    });
  });

  test("returns nothing without products or columns", () => {
    expect(trailing({ 0: block("a", "right") }, 4, 0)).toEqual([]);
    expect(
      trailing_content_blocks({
        content_blocks_by_index_: ["a"],
        rows_by_index_: [[0]],
        displaced_products_: [],
        n_cols_currently_showing_: null,
        product_count: 1,
      })
    ).toEqual([]);
  });

  test("keeps blocks in the last product row and its next row when they share an index", () => {
    // Row 2 right and row 3 left both land in front of product 11. The row 2 block and the immediately following row are trailing.
    expect(trailing({ 2: block("a", "right"), 3: block("b") }, 4, 11)).toEqual([["a", "b"]]);
  });

  test("finds the last product's row below a stack of full-width banners", () => {
    // Banners fill rows 0-2, so a single product lands in row 3 and the card in that row's right slot is trailing.
    // These banners are configured as one row tall before remapping.
    const banner = (content: string): Block => ({ ...block(content), span_columns: 4, span_rows: 1 });
    expect(trailing({ 0: banner("b0"), 1: banner("b1"), 2: banner("b2"), 3: block("card", "right") }, 4, 1)).toEqual([
      "card",
    ]);
  });
});

describe("content block row heights", () => {
  test("sizes rows through each multi-row card and gives full-width banners their own height", () => {
    const blocks = [
      { span_columns: 4, span_rows: 1 },
      undefined,
      { span_columns: 2, span_rows: 2 },
      undefined,
      { span_columns: 2, span_rows: 2 },
    ];
    expect(get_content_block_row_styles(blocks, 4)).toEqual([
      { row: 2, template: "auto 1fr 1fr 1fr" },
      { row: 4, template: "auto 1fr 1fr 1fr 1fr 1fr" },
    ]);
  });

  test("leaves single-row and full-width cards at their existing height", () => {
    expect(get_content_block_row_styles([{ span_columns: 2, span_rows: 1 }], 4)).toEqual([]);
    expect(get_content_block_row_styles([{ span_columns: 2, span_rows: 2 }], 2)).toEqual([]);
    expect(get_content_block_row_styles([{ span_columns: 2, span_rows: 2 }], null)).toEqual([]);
  });
});
