import { describe, expect, test } from "@jest/globals";
import { remap_blocks_to_index, trailing_content_blocks } from "./create_content_blocks";

const block = (content: string, position: "left" | "center" | "right" = "left") => ({
  span_columns: 1,
  span_rows: 1,
  position,
  content,
});

describe("trailing_content_blocks", () => {
  test("returns nothing when every block sits in front of a product", () => {
    expect(trailing_content_blocks(["a", undefined, "b"], 15)).toEqual([]);
  });

  test("returns the block in the right slot of a last row that isn't full", () => {
    // 15 products in 4 columns: the 4th row holds products 13-15, so its right slot (index 15) has no product after it
    const wrapped_blocks_: (ReturnType<typeof block> | undefined)[] = [];
    wrapped_blocks_[3] = block("card", "right");
    const { content_blocks_by_index_ } = remap_blocks_to_index({ wrapped_blocks_, n_cols_currently_showing_: 4 });

    expect(content_blocks_by_index_[15]).toBe("card");
    expect(trailing_content_blocks(content_blocks_by_index_, 15)).toEqual(["card"]);
    expect(trailing_content_blocks(content_blocks_by_index_, 16)).toEqual([]);
  });

  test("keeps index order and skips holes past the last product", () => {
    const blocks: (string | string[] | undefined)[] = [];
    blocks[2] = "in-grid";
    blocks[7] = "first";
    blocks[12] = ["second", "third"];
    expect(trailing_content_blocks(blocks, 5)).toEqual(["first", ["second", "third"]]);
  });
});
