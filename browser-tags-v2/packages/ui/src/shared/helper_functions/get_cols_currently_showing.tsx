import { Accessor, createMemo } from "solid-js";
import { media_query_to_accessor } from "./media_query_to_accessor";
import { ColsAtSize, dwarn, layout_media_query_header } from "@depict-ai/utilishared";

/**
 * Figures out how many columns from a cols_at_size declaration we are showing at the current screen size
 * Returns an accessor that returns null if no size is active and logs that to the console
 */
export function get_cols_currently_showing(cols_at_size_: Accessor<ColsAtSize>) {
  const size_active = createMemo(() =>
    cols_at_size_().map(([n_cols, min_width, max_width]) => {
      const media_query = layout_media_query_header(min_width!, max_width!).replaceAll("@media", "");
      const matches = media_query_to_accessor(media_query);
      return [matches, n_cols] as const;
    })
  );
  const n_cols_currently_showing = createMemo(() => {
    try {
      const [, n_cols_currently_showing] = size_active().find(([media_query]) => media_query())!;
      return n_cols_currently_showing;
    } catch (e) {
      dwarn("No active size found in columnsAtSize - can't render content blocks or looks");
      return null;
    }
  });

  return n_cols_currently_showing;
}
