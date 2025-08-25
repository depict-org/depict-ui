import { ReactContentBlocksByRow } from "../types";
import { ReactPortal } from "react";
import { render_display_or_block_from_react_template } from "./render_display_or_block_from_react_template";
import { mapArray } from "solid-js";

/**
 * Takes content blocks in the React interface (as a store in an accessor) and returns content blocks for the Solid interface.
 */
export function solidify_content_blocks_by_row(
  blocks: () => ReactContentBlocksByRow | undefined,
  component_portals: Set<ReactPortal>,
  set_portals: (portals: ReactPortal[]) => void
) {
  // This will re-render everything if a block moves around but the alternative is that we re-render every time any state that has been used in the content blocks changes which is worse
  return mapArray(blocks, block => {
    if (!block) return block;
    return {
      get span_columns() {
        return block?.spanColumns;
      },
      get span_rows() {
        return block?.spanRows;
      },
      get position() {
        return block?.position;
      },
      content: () =>
        render_display_or_block_from_react_template({
          get_react_template: () => block.content,
          component_portals,
          set_portals,
          component_props: {},
        }),
    };
  });
}
