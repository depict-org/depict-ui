import { convert_sdk_cols_at_size_to_layout } from "./cols_at_size_transformer";

describe("Transformer", () => {
  it("should throw an error when duplicate widths", () => {
    expect(() =>
      convert_sdk_cols_at_size_to_layout([
        [1, 2],
        [2, 2],
      ])
    ).toThrow();
  });

  it("should throw an error when one element is not an array", () => {
    // @ts-ignore
    expect(() => convert_sdk_cols_at_size_to_layout([[1], 2])).toThrow();
  });

  it("should throw an error when several undefined widths", () => {
    expect(() => convert_sdk_cols_at_size_to_layout([[1], [2]])).toThrow();
  });

  it("should transform when width given in ascending order", () => {
    expect(() =>
      convert_sdk_cols_at_size_to_layout([
        [1, 1],
        [2, 2],
      ])
    ).not.toThrow();
  });

  it("should transform when width given in descending order", () => {
    expect(() =>
      convert_sdk_cols_at_size_to_layout([
        [1, 2],
        [2, 1],
      ])
    ).not.toThrow();
  });

  it("should transform when width given in ascending order (with undefined width)", () => {
    convert_sdk_cols_at_size_to_layout([[1, 1], [2, 2], [3]]);
  });

  it("should NOT re-order elements", () => {
    expect(convert_sdk_cols_at_size_to_layout([[3], [2, 1200], [1, 800]])).toEqual([
      [3, "1201px", ""],
      [2, "801px", "1200px"],
      [1, "", "800px"],
    ]);
  });

  it("should re-order elements based on width", () => {
    expect(convert_sdk_cols_at_size_to_layout([[1, 800], [2, 1200], [3]])).toEqual([
      [3, "1201px", ""],
      [2, "801px", "1200px"],
      [1, "", "800px"],
    ]);
  });

  it("should transform when there is only one size provided (without width)", () => {
    expect(convert_sdk_cols_at_size_to_layout([[1]])).toEqual([[1, "", ""]]);
  });

  it("should transform when there is only one size provided (with width)", () => {
    expect(convert_sdk_cols_at_size_to_layout([[1, 800]])).toEqual([[1, "", "800px"]]);
  });
});
