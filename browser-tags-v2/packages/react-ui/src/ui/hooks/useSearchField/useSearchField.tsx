import { SearchFieldProps, UseSearchFieldReturn } from "./useSearchField.types";
import { wrap_solid_in_react } from "../../../util";
import { SearchField } from "@depict-ai/ui";
import { useCallback, useState } from "react";
import { createMemo, createSignal, JSX } from "solid-js";
import { get_instance_and_track_component } from "../../../helpers/get_instance_and_track_component";
import { SolidShowComponentAfterStateSet } from "../../../helpers/SolidShowComponentAfterStateSet";

/**
 * Hook used to configure the Depict search field.
 * @example
 * Render a search field that opens a modal aligned to the search field itself:
 * ```tsx
 * import React from "react";
 * import { useSearchField } from "@depict-ai/react-ui";
 *
 * const App = () => {
 *   const { SearchField } = useSearchField();
 *
 *   return (
 *     <div>
 *       <SearchField />
 *     </div>
 *   );
 * };
 * ```
 * @example
 * Render a search field that opens a modal aligned another DOM element:
 * ```tsx
 * import React from "react";
 * import { ComponentAligner, useSearchField } from "@depict-ai/react-ui";
 *
 * const App = () => {
 *   const ref = useRef(null);
 *   const { SearchField } = useSearchField({
 *     alignerRef: ref
 *   });
 *
 *   return (
 *     <div>
 *       <ComponentAligner ref={ref} />
 *       <SearchField />
 *     </div>
 *   );
 * };
 * ```
 * @returns {UseSearchFieldReturn}
 */
export const useSearchField = (props: SearchFieldProps = {}): UseSearchFieldReturn => {
  // We should just export a plain SearchField component here, not a weird hook thing, but I don't want to make a breaking change. Just fixing the re-rendering issue for now.
  // Create signal that persists across renders
  const [[get_aligner_signal_value, set_aligner_signal_value]] = useState(
    createSignal<{ current: Parameters<typeof SearchField>[0]["aligner_ref"] }>()
  );
  // Update signal value when alignerRef changes
  set_aligner_signal_value(props?.alignerRef);

  // Make sure react never re-renders the actual SearchField component
  const componentFunction = useCallback(
    () =>
      wrap_solid_in_react({
        solid_component: () => (
          <SolidShowComponentAfterStateSet>
            {
              createMemo(() => {
                const depict_search = get_instance_and_track_component("search", props.stateKey, "useSearchField");
                return SearchField({
                  depict_search,
                  get aligner_ref() {
                    // React mutates the object at some random time so only get the current value once it actually is requested
                    return get_aligner_signal_value()?.current;
                  },
                });
              }) as unknown as JSX.Element
            }
          </SolidShowComponentAfterStateSet>
        ),
        props: {},
      }),
    []
  );

  return {
    SearchField: componentFunction,
  };
};
