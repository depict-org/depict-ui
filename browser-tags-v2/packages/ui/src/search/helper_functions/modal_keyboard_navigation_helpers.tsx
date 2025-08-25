import {
  CurrentlyShowingKeyboardSelectableItems,
  KeyboardNavigationData,
  SelectedIndexType,
} from "./keyboard_navigation_types";
import { Accessor, createComputed, createEffect, createMemo, onCleanup } from "solid-js";

/**
 * Tells you if an item is selected in the search modal keyboard navigation
 * @param selectedIndex the accessor that autocomplete_keyboard_navigation uses to specify what's selected
 * @param groupIndex the index of your group in the search modal keyboard navigation
 * @param indexInGroup the index of your item your group
 * @returns a tuple of a function that tells you if the item is selected and a function that tells you if the item is selected due to keyboard navigation
 */
export function useIsSelected(
  selectedIndex: SelectedIndexType[0],
  groupIndex: Accessor<number>,
  indexInGroup: Accessor<number>
) {
  const isSelected = createMemo(() => {
    const selectedValue = selectedIndex();
    return selectedValue?.[0] === groupIndex() && selectedValue?.[1] === indexInGroup();
  });
  const selectedDueToKeyboardNavigation = createMemo(() => !!(isSelected() && selectedIndex()?.[2]));
  return [isSelected, selectedDueToKeyboardNavigation] as const;
}

/**
 * Registers the following data to be in a group in the search modal keyboard navigation until the component is cleaned up.
 */
export function setKeyboardNavigationEntry(
  set_currently_showing_suggestions: CurrentlyShowingKeyboardSelectableItems[1],
  itemIndex: Accessor<number>,
  itemsWeAreShowing: Accessor<ReturnType<KeyboardNavigationData> | undefined>
) {
  const isEmpty = createMemo(() => !itemsWeAreShowing()?.length);
  createComputed(() => {
    // If empty, remove us from the currently showing suggestions since I'm not sure the code in autocomplete_keyboard_navigation can handle empty groups
    if (isEmpty()) return;
    createComputed(() => {
      const index = itemIndex();
      set_currently_showing_suggestions(value => {
        value[index] = () => itemsWeAreShowing() || [];
        return value;
      });
      onCleanup(() =>
        set_currently_showing_suggestions(value => {
          delete value[index];
          return value;
        })
      );
    });
  });
}

export function scrollIntoViewIfSelectedByKeyboardNavigation(
  element: Element,
  selectedDueToKeyboardNavigation: Accessor<boolean>
) {
  createEffect(() => {
    if (selectedDueToKeyboardNavigation()) {
      element.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });
}
