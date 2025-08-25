import { Display, ModernDisplay } from "@depict-ai/utilishared";
import { createRoot, createSignal, JSX as solid_JSX } from "solid-js";
import { connect_search_field_height_to_aligner_height } from "../../../shared/helper_functions/connect_search_field_height_to_aligner_height";
import { align_field, ALIGN_TOP, ModalAlignmentSignals } from "../align_field";
import type { OpenModalParams } from "./open_modal.types";

import { setupDefaultAnimations } from "../modalV2Animations";

/**
 * Open the modal with support for alignment.
 * @returns {void}
 */
export const open_modal_with_alignment = <OriginalDisplay extends Display, OutputDisplay extends ModernDisplay | never>(
  openModalParams: OpenModalParams<OriginalDisplay, OutputDisplay>
) => {
  const { search, makesNewSearch = true } = openModalParams;
  let cleanup: VoidFunction | undefined;

  openModalParams.location ||= "centered";

  if (openModalParams.location === "aligned" && !openModalParams.element) {
    throw new Error("No active search header aligner on the page!");
  }

  if (openModalParams.location !== "aligned") {
    // Open centered modal
    search.modal_open = [{ dont_sync_search_field_value_except_on_submit_: makesNewSearch }];
    return;
  }

  const alignment_height = openModalParams.element?.clientHeight;

  if (isNaN(alignment_height!)) {
    // Open centered modal
    search.modal_open = [{ dont_sync_search_field_value_except_on_submit_: makesNewSearch }];
    return;
  }

  if (!openModalParams.ignoreFieldSize_) {
    ({ cleanup } = connect_search_field_height_to_aligner_height(openModalParams.element));
  }

  let dispose_aligner: VoidFunction;

  /**
   * Setting position to fixed is important to make the modal work with align_field.
   */
  const alignmentSignals_: ModalAlignmentSignals = {
    body_: createSignal<solid_JSX.CSSProperties>({
      position: "fixed",
    }),
    field_: createSignal<solid_JSX.CSSProperties>({}),
    backdrop_: createSignal<solid_JSX.CSSProperties>({}),
  };

  const closingAnimation = setupDefaultAnimations(alignmentSignals_, openModalParams.runAnimations_ ? 2 : 1);

  createRoot(dispose => {
    dispose_aligner = () => {
      cleanup?.();
      dispose();
    };

    align_field(alignmentSignals_, openModalParams.element, ALIGN_TOP);
  });

  search.modal_open = [
    {
      alignmentSignals_,
      dont_sync_search_field_value_except_on_submit_: makesNewSearch,
      closing_animation_: closingAnimation,
    },
    dispose_aligner!,
  ];
};
