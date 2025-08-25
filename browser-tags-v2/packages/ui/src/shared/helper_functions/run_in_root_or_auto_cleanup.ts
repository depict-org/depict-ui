import { SentryErrorBoundary } from "../components/SentryErrorBoundary";
import { createComponent, createRoot, getOwner } from "solid-js";
import { Node_Array, observer } from "@depict-ai/utilishared";

export function run_in_root_or_auto_cleanup<T extends Node_Array | HTMLElement>(
  component: () => T,
  error_message: string
) {
  const component_in_error_boundary = (do_with_elements?: (elements: Node_Array | HTMLElement) => void) => {
    const error_boundary_wrapped = SentryErrorBoundary({
      severity_: "error",
      message_: error_message,
      get children() {
        const elements = createComponent(component, {}) as Node_Array;
        do_with_elements?.(elements);
        return elements;
      },
    });
    // This might return an accessor, in that case we need to "unwrap" it since our SDK consumers expect HTML elements or arrays thereof
    if (typeof error_boundary_wrapped === "function") {
      // @ts-ignore
      return error_boundary_wrapped() as ReturnType<typeof component>;
    }
    // On the server it returns a string, so we just return that
    return error_boundary_wrapped as ReturnType<typeof component>;
  };
  const owner = getOwner();
  if (owner == null) {
    return createRoot(dispose => {
      // if we're not already run in a root, create a root and automatically dispose it when the first returned element is removed from the DOM
      return component_in_error_boundary(elements => {
        const have_multiple = Array.isArray(elements);
        if (have_multiple ? !elements?.length : !elements) {
          return;
        }
        observer.onremoved(have_multiple ? elements[0] : elements, ({ element }) => {
          if (document.documentElement.contains(element)) return; // If element has instantly been re-inserted, don't dispose
          // See https://depictaiworkspace.slack.com/archives/C050GHEPBTR/p1695809102791259?thread_ts=1695106805.459729&cid=C050GHEPBTR
          dispose();
        });
      });
    });
  } else {
    // we're already in a root so cleanups are handled
    return component_in_error_boundary();
  }
}
