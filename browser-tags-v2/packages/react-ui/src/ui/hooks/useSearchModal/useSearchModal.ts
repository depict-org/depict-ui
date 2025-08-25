import { globalState } from "../../../global_state";
import { createOpenModal } from "./useSearchModal.service";
import { UseSearchModalParams, UseSearchModalReturn } from "./useSearchModal.types";

/**
 * Hook used to open the search modal.
 * @example
 * Open a centered modal:
 * ```tsx
 * import React from "react";
 * import { useSearchModal } from "@depict-ai/react-ui";
 *
 * const App = () => {
 *   const { open } = useSearchModal({
 *     location: "centered",
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={open}>Open</button>
 *     </div>
 *   );
 * };
 * ```
 * @returns {UseSearchModalReturn}
 */
export function useSearchModal(params: UseSearchModalParams = {}): UseSearchModalReturn {
  const open = createOpenModal({ globalState, ...params });

  return {
    open,
  };
}
