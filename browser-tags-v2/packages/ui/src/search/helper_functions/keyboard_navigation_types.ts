import { Accessor, Signal } from "solid-js";

/**
 * A suggestion item in the view of the keyboard navigation. If it only has a title, selecting it will change the search query to that title. If it has a page_url, selecting it will navigate to that page.
 */
export type TextSuggestionType = { title_: string } & { page_url_?: string };
/**
 * The type of the currently selected item in the keyboard navigation. The first number is the group index and the second number is the item index. The third element is the element that is currently selected (the one that has item index) - it will be scrolled into view when keyboard navigated to.
 */
export type SelectedIndexType = Signal<
  undefined | [groupIndex: number, itemIndex: number, becauseKeyboardNavigation?: boolean]
>;
export type KeyboardNavigationData = Accessor<TextSuggestionType[]>;
export type CurrentlyShowingKeyboardSelectableItems = Signal<KeyboardNavigationData[]>;
