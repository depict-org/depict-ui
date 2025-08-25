import { SDKColsAtSize } from "../../shared/helper_functions/cols_at_size_transformer/cols_at_size_transformer";
import { limit_cols_at_size_for_content_results } from "./limit_cols_at_size_for_content_results";

describe("limit_cols_at_size_for_content_results function tests", () => {
  // GPT generated, the descriptions are probably bullshit

  test("should transform a single two-column setting to add a one-column setting for small screens", () => {
    const input: SDKColsAtSize = [[2]];
    const expectedOutput: SDKColsAtSize = [[1, 600], [2]];
    expect(limit_cols_at_size_for_content_results(input, 600)).toEqual(expectedOutput);
  });

  test("should maintain the initial settings if they already cater for small screens", () => {
    const input: SDKColsAtSize = [[1, 600], [2, 1000], [3, 1200], [4]];
    const expectedOutput: SDKColsAtSize = [[1, 600], [2, 1000], [3, 1200], [4]];
    expect(limit_cols_at_size_for_content_results(input, 600)).toEqual(expectedOutput);
  });

  test("should add one-column setting for small screens if two-columns are set for small screens", () => {
    const input: SDKColsAtSize = [[2, 600], [3, 1200], [4]];
    const expectedOutput: SDKColsAtSize = [[1, 600], [3, 1200], [4]];
    expect(limit_cols_at_size_for_content_results(input, 600)).toEqual(expectedOutput);
  });

  test("should adjust one-column setting to the appropriate size if it's set for smaller than the minimum", () => {
    const input: SDKColsAtSize = [[1, 450], [2, 1000], [3, 1200], [4]];
    const expectedOutput: SDKColsAtSize = [[1, 600], [2, 1000], [3, 1200], [4]];
    expect(limit_cols_at_size_for_content_results(input, 600)).toEqual(expectedOutput);
  });

  test("should adjust and deduplicate settings for screens smaller than the minimum", () => {
    const input: SDKColsAtSize = [[2, 450], [2, 1000], [3, 1200], [4]];
    const expectedOutput: SDKColsAtSize = [[1, 600], [2, 1000], [3, 1200], [4]];
    expect(limit_cols_at_size_for_content_results(input, 600)).toEqual(expectedOutput);
  });

  test("Random order", () => {
    const input: SDKColsAtSize = [[6], [2, 450], [4, 1000], [1, 300], [5, 1200], [3, 600]];
    const expectedOutput: SDKColsAtSize = [[1, 600], [4, 1000], [5, 1200], [6]];
    expect(limit_cols_at_size_for_content_results(input, 600)).toEqual(expectedOutput);
  });
});
