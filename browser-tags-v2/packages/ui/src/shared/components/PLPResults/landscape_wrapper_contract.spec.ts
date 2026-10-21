import { transformContentBlocks } from "../../../../../js-ui/src/helpers/transformContentBlocks";
import { make_solid_content_block } from "../../../../../react-ui/src/helpers/make_solid_content_block";

describe("content card wrapper contracts", () => {
  it("passes aspectRatio from the JavaScript wrapper to the SDK field", () => {
    const [block] = transformContentBlocks([
      { spanColumns: 2, spanRows: 1, aspectRatio: 1.5, position: "center", content: () => document.createElement("div") },
    ]) || [];
    expect(block).toMatchObject({ span_columns: 2, span_rows: 1, aspect_ratio: 1.5 });
  });

  it("passes aspectRatio from the React wrapper to the SDK field", () => {
    const block = make_solid_content_block(
      { spanColumns: 2, spanRows: 1, aspectRatio: 1.5, position: "center" },
      () => null
    );
    expect(block.aspect_ratio).toBe(1.5);
  });
});
