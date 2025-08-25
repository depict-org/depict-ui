/** @jsxImportSource solid-js */
import { Accessor, createMemo, Index, Signal } from "solid-js";
import { ContentCard } from "./ContentCard";
import { content_results_start_rows } from "./ContentResults";
import { ColsAtSize } from "@depict-ai/utilishared";
import { get_cols_currently_showing } from "../../shared/helper_functions/get_cols_currently_showing";

export function ContentPlaceholderCards({
  content_results_rows_: [get_history_state_content_results_rows],
  cols_at_size_,
  overrideAmount_,
}: {
  content_results_rows_: Signal<number>;
  cols_at_size_: Accessor<ColsAtSize>;
  overrideAmount_: Accessor<number | undefined>;
}) {
  const colsShowingNow = get_cols_currently_showing(cols_at_size_);
  const largest_column = createMemo(() => {
    const largest_in_cols_at_size = Math.max(...cols_at_size_().map(([cols]) => cols));
    if (isNaN(largest_in_cols_at_size) || Math.abs(largest_in_cols_at_size) === Infinity) {
      return 4; // fallback to something big so we always have the right amount of placeholders
    }
    return largest_in_cols_at_size;
  });
  const num_placeholders = createMemo(() => {
    const override = overrideAmount_();
    if (override !== undefined) {
      return override;
    }

    // Use how many columns we're actually showing, if available, so that we're showing exactly as many placeholders as we'd show content, so that the view more button doesn't appear/disappear and makes the layout shift
    return (
      (get_history_state_content_results_rows() ?? content_results_start_rows) * (colsShowingNow() || largest_column())
    );
  });
  return <Index each={Array.from({ length: num_placeholders() })}>{() => <ContentCard />}</Index>;
}
