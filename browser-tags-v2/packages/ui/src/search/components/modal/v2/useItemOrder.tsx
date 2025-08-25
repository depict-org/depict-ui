import { Accessor, createMemo } from "solid-js";

/**
 * Returns the current index of the items in the modal in the arrow up/down keyboard navigation as well as visually (in stacked layout) via order css
 * @param modalLayoutStacked if modal is in stacked layout
 */
export function useItemOrder(modalLayoutStacked: Accessor<boolean>) {
  const suggestionsIndex_ = createMemo(() => 1);
  const previousSearchesIndex_ = createMemo(() => 2);
  const contentResultsIndex_ = createMemo(() => (modalLayoutStacked() ? 5 : 3));
  const instantResultsIndex_ = createMemo(() => 4);
  const listingSuggestionsIndex_ = createMemo(() => (modalLayoutStacked() ? 3 : 5));

  return {
    suggestionsIndex_,
    listingSuggestionsIndex_,
    previousSearchesIndex_,
    contentResultsIndex_,
    instantResultsIndex_,
  };
}
