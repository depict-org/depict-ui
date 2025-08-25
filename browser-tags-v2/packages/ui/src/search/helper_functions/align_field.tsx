import { Accessor, JSX as solid_JSX, onCleanup, Signal } from "solid-js";
import { catchify } from "@depict-ai/utilishared";
import { guaranteeAlignment } from "./guaranteeAlignment";

export type ModalAlignmentSignals = {
  body_: Signal<solid_JSX.CSSProperties>;
  field_: Signal<solid_JSX.CSSProperties>;
  backdrop_?: Signal<solid_JSX.CSSProperties>;
};

/**
 * Flag to align by top
 */
export const ALIGN_TOP = 0b1;
/**
 * Flag to align by left
 */
export const ALIGN_LEFT = 0b10;
/**
 * Flag to also align the width of the modal to the element
 */
export const ALIGN_WIDTH_ON_MODAL = 0b100;
/**
 * Flag to also align the width of the search field in the modal to the element
 */
export const ALIGN_WIDTH_ON_FIELD_IN_MODAL = 0b1000;
/**
 * Whether to align the center of the element to align to, to the center of the modal. If set, `transform: translateX(-50%)` will also be applied to the modal
 */
export const SET_CENTERED_LEFT = 0b10000;

/**
 * Useful for aligning the search modal to an element, like an existing input field
 * @param alignmentSignals a signal containing the style properties that will be applied to the modal body and serach field. You provide it to open_modal_ as `alignmentSignals_` when using SearchModal
 * @param input_field the element to align to.
 * @param alignment a bitmask of ALIGN_TOP, ALIGN_LEFT, ALIGN_WIDTH to determine how to align. Example: `ALIGN_TOP | ALIGN_LEFT` aligns both top and left
 * @param includeScroll Should the aligner offset with scrolling? Useful to set to false when using position: fixed
 * @param pollAlignment a reactive accessor, for the duration that it returns true the alignment will be re-ran every frame. Useful for when you're aligning to a moving element that doesn't change its width.
 * @returns a function that can be called any time to re-run the alignment routine in case that the elements have gone out of alignment
 */
export function align_field(
  { body_: [, setModalBodyStyle], field_: [, setModalFiedlStyle] }: ModalAlignmentSignals,
  input_field: HTMLElement,
  alignment: number,
  includeScroll?: boolean,
  pollAlignment: Accessor<boolean> = () => false
) {
  const ensureAlignedPosition = guaranteeAlignment(() => {
    const rect =
      input_field.getBoundingClientRect(); /* for some reason contentRect.top and contentRect.left is 0 from the RO */
    const addToLeftValue = alignment & SET_CENTERED_LEFT ? rect.width / 2 : 0;
    const leftWithoutScroll = rect.left + addToLeftValue;
    const topValue = rect.top + (includeScroll ? scrollY : 0);
    setModalBodyStyle(old_value => ({
      ...old_value, // Do not allow top values under 0, this usually happens when aligning to an element that's absolutely positioned and the user is scrolled down - in that case we want to sacrifice alignment for the modal being visible
      ...(alignment & ALIGN_TOP ? { top: `${topValue >= 0 ? topValue : 0}px` } : {}),
      ...(alignment & ALIGN_LEFT
        ? {
            left: `${leftWithoutScroll + (includeScroll ? scrollX : 0)}px`,
          }
        : {}),
      ...(alignment & SET_CENTERED_LEFT
        ? {
            transform: "translateX(-50%)",
          }
        : {}),
    }));
  }, pollAlignment);

  let ro: ResizeObserver | undefined;
  if (alignment & ALIGN_WIDTH_ON_MODAL || alignment & ALIGN_WIDTH_ON_FIELD_IN_MODAL) {
    ro = new ResizeObserver(
      catchify(records => {
        records.forEach(({ contentRect: { width } }) => {
          if (alignment & ALIGN_WIDTH_ON_FIELD_IN_MODAL) {
            setModalFiedlStyle(old_value => ({
              ...old_value,
              "max-width": `${width}px`,
            }));
            return;
          }
          setModalBodyStyle(old_value => ({
            ...old_value,
            "max-width": "unset",
            width: `${width}px`,
          }));
        });
        ensureAlignedPosition();
      })
    );
    ro.observe(input_field);
  }

  onCleanup(catchify(() => ro?.disconnect()));
  return ensureAlignedPosition;
}
