import { createElement, forwardRef } from "react";

/**
 * A component used to align other Depict components to.
 * @example
 * Align the search modal
 * ```tsx
 * import React from "react";
 * import { ComponentAligner, useSearchModal } from "@depict-ai/react-ui";
 *
 * const App = () => {
 *   const ref = React.createRef();
 *
 *   const { open } = useSearchModal({
 *     location: "aligned",
 *     alignerRef: ref,
 *   });
 *
 *   return (
 *     <div>
 *       <ComponentAligner ref={ref} />
 *       <button onClick={open}>Open</button>
 *     </div>
 *   );
 * };
 * ```
 * @returns {JSX.Element}
 */

export const ComponentAligner = forwardRef((_, ref) => {
  return createElement("div", {
    className: "depict aligner",
    style: { height: "100%" },
    ref,
  });
});
