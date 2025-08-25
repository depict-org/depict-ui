import { createComputed, createMemo, createSignal, JSX as solid_JSX } from "solid-js";
import { media_query_to_accessor } from "../../shared/helper_functions/media_query_to_accessor";
import { ModalAlignmentSignals } from "./align_field";

/**
 * Takes a given style props signal (or creates one), resets it, and sets it to the value needed to have a centered modal.
 * @param alignmentSignals_ - The style props signal to use, optional.
 */

export function center_modal_style_props({
  alignmentSignals_,
}: {
  alignmentSignals_?: ModalAlignmentSignals;
} = {}) {
  alignmentSignals_ = {
    body_: createSignal<solid_JSX.CSSProperties>({}),
    field_: createSignal<solid_JSX.CSSProperties>({}),
    backdrop_: createSignal<solid_JSX.CSSProperties>({}),
    ...alignmentSignals_,
  };
  const [, set_style_props] = alignmentSignals_.body_;
  const supports_hover = media_query_to_accessor("(hover: hover) and (pointer: fine)");
  const desktop_short = media_query_to_accessor("(max-height: 790px)");
  const mobile_short = media_query_to_accessor("(max-height: 1000px)");
  const transform_y = createMemo(() => (supports_hover() ? !desktop_short() : !mobile_short()));

  set_style_props({
    position: "fixed",
    top: "50%",
  });

  createComputed(() =>
    set_style_props(old_value => ({
      ...old_value,
      transform: transform_y() ? "translateY(-50%)" : "unset",
    }))
  );

  return alignmentSignals_ as Omit<ModalAlignmentSignals, "backdrop_"> &
    Required<Pick<ModalAlignmentSignals, "backdrop_">>;
}
