import { DepictSearch, modalVersionSymbol, open_modal_with_alignment } from "@depict-ai/ui";
import { CreateOpenModalParams } from "./useSearchModal.types";
import { get_instance_and_track_component } from "../../../helpers/get_instance_and_track_component";
import { createRoot } from "solid-js";
import { useEffect, useState } from "react";
import { globalState } from "../../../global_state";

/**
 * Opens the search modal.
 * @returns {void}
 */
export const createOpenModal = (createOpenModalParams: CreateOpenModalParams) => {
  const { location = "centered", alignerRef, stateKey } = createOpenModalParams;

  let [deduped_variable, set_deduped_variable] = useState<[DepictSearch<any>, () => void]>();

  // When component using this hook unmounts, "untrack" our component and dispose the search instance if needed
  useEffect(() => deduped_variable?.[1]?.(), []);

  const openModal = () => {
    // Get the search instance and track this component, but only once (basically work around re-rendering)
    // We have to do this in the openModal function since people might call this hook before creating DepictProvider
    if (!deduped_variable) {
      deduped_variable = createRoot(dispose => [
        get_instance_and_track_component("search", stateKey, "useSearchModal"),
        dispose,
      ]);
      set_deduped_variable(deduped_variable);
    }
    const [search] = deduped_variable;
    const runAnimations_ = globalState.searchModalComponent_?.[modalVersionSymbol] === 2;
    if (location === "aligned" && alignerRef?.current) {
      open_modal_with_alignment({
        "element": alignerRef.current,
        "location": location,
        "search": search as DepictSearch<any, any>,
        runAnimations_,
      });
    } else {
      open_modal_with_alignment({
        "location": "centered",
        "search": search as DepictSearch<any, any>,
        runAnimations_,
      });
    }
  };

  return openModal;
};
