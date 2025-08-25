import { createSignal } from "solid-js";
import { JSUIContentBlocksByRow } from "../types";

/**
 * Use this to be able to update content blocks. This will contain the blocks, you can pass getContentBlocksByRow to CategoryPage/SearchPage and then use setContentBlocksByRow to dynamically update the blocks.
 * @returns setContentBlocksByRow which takes a JSUIContentBlocksByRow and updates the blocks and getContentBlocksByRow which is the current blocks.
 */
export function contentBlockStore(initialValue: JSUIContentBlocksByRow = []) {
  const [blocks, setContentBlocksByRow] = createSignal<JSUIContentBlocksByRow>(initialValue, { equals: false });
  return {
    getContentBlocksByRow: blocks,
    setContentBlocksByRow,
  };
}
