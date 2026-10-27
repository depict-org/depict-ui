import type { ReactContentBlock } from "../types";

type BlockFields = Pick<ReactContentBlock, "spanColumns" | "spanRows" | "aspectRatio" | "position">;

export function make_solid_content_block<TContent>(block: BlockFields, content: () => TContent) {
  return {
    get span_columns() {
      return block.spanColumns;
    },
    get span_rows() {
      return block.spanRows;
    },
    get aspect_ratio() {
      return block.aspectRatio;
    },
    get position() {
      return block.position;
    },
    content,
  };
}
