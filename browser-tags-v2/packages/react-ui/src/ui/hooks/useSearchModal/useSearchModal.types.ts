import React from "react";
import { GlobalState } from "../../../global_state";

/**
 * Parameters to configure the search modal.
 */
export interface UseSearchModalParams {
  /**
   * How the modal should be opened.
   * Will default to "centered" if nothing else is specified.
   * - "centered" - The modal will be opened in the center of the screen.
   * - "aligned" - The modal will be opened aligned to the alignerRef element.
   */
  location?: ModalLocation;
  /**
   * The ref to the element that the modal should be aligned to.
   * This is only used when location is "aligned".
   * @default undefined
   * @example
   * ```tsx
      import React from "react";
      import { ComponentAligner, useSearchModal } from "@depict-ai/react-ui";

      const App = () => {
        const ref = React.createRef();

        const { open } = useSearchModal({
          location: "aligned",
          alignerRef: ref,
        });

        return (
          <div>
            <ComponentAligner ref={ref} />
            <button onClick={open}>Open</button>
          </div>
        );
      };
   * ```
   */
  alignerRef?: React.RefObject<HTMLElement>;
  /**
   * When using multiple search instances on the same page, you need to set a unique stateKey for each one. We recommend using an incrementing number, such as "1", "2", "3", etc. To associate a modal with a SearchPage keyed component, set the same stateKey on both. If no stateKey is provided, the "default" instance will be used.
   */
  stateKey?: string;
}

export interface CreateOpenModalParams {
  location?: ModalLocation;
  alignerRef?: React.RefObject<HTMLElement>;
  globalState: GlobalState;
  /**
   * When using multiple search instances on the same page, you need to set a unique stateKey for each one. We recommend using an incrementing number, such as "1", "2", "3", etc. To associate a modal with a SearchPage keyed component, set the same stateKey on both. If no stateKey is provided, the "default" instance will be used.
   */
  stateKey?: string;
}

export type OpenModal = () => void;

/**
 * How the modal should be opened.
 */
export type ModalLocation = "centered" | "aligned";

/**
 * Options for opening the modal.
 */
export interface OpenModalOptions {
  /**
   * How the modal should be opened.
   */
  location?: ModalLocation;
}

export interface UseSearchModalReturn {
  open: OpenModal;
}
