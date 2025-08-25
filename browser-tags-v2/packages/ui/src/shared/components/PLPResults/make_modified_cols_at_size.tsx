import { Accessor, createMemo } from "solid-js";
import { SolidLayoutOptions } from "../SolidLayout";

/**
 * Changes cols_at_size depending on if filters are open or not so one card less is shown when the filters are open
 * This function is special to the actual PLPResults.
 */
export function make_modified_cols_at_size({
  layout_options_,
  sort_or_filter_open_,
}: {
  layout_options_: Accessor<
    Omit<
      SolidLayoutOptions,
      "container_element" | "layout" | "rows" | "disable_partial_rows" | "children" | "element_attributes"
    >
  >;
  sort_or_filter_open_: Accessor<boolean>;
}) {
  return createMemo(() => {
    const layout_options = layout_options_();
    // Add grid styling that changes when filters get opened/closed
    const when_filters_closed_cols = layout_options.cols_at_size;
    return sort_or_filter_open_()
      ? when_filters_closed_cols.map(row => {
          const [num_cols_default, , , , override_cols] = row;
          const cloned_row = [...row] as typeof row;
          // @ts-ignore
          cloned_row[0] = num_cols_default - 1;
          if (override_cols) {
            // @ts-ignore
            cloned_row[4] = {
              overrides: Object.fromEntries(
                Object.entries(override_cols.overrides).map(([row, column]) => [row, column - 1])
              ),
            };
          }
          return cloned_row;
        })
      : when_filters_closed_cols;
  });
}
