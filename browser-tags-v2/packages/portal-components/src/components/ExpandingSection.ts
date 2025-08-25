import { createElement, Fragment, ReactNode, useState } from "react";
import { ExpandingDetails } from "@depict-ai/ui/latest";
import { wrap_solid_in_react } from "../utils/wrap_solid_in_react";
import { get_set_function_to_signal } from "../utils/get_set_function_to_signal";
import * as reactDom from "react-dom";

export function ExpandingSection({
  summary: summary_children,
  children,
  className,
  ...other_react_props
}: {
  className?: string;
  children: ReactNode;
  summary: ReactNode;
  is_open: boolean;
  set_is_open: (new_value: boolean) => void;
  duration?: number;
}) {
  let [summary, set_summary] = useState<HTMLElement | undefined>();
  if (!summary) {
    summary = document.createElement("summary");
    set_summary(summary);
  }
  let [child_wrapper, set_child_wrapper] = useState<HTMLElement | undefined>();
  if (!child_wrapper) {
    child_wrapper = document.createElement("div");
    set_child_wrapper(child_wrapper);
  }

  return createElement(
    Fragment,
    null,
    wrap_solid_in_react({
      solid_component: (props, wrapper_element) => {
        ExpandingDetails({
          children: child_wrapper,
          details_: wrapper_element as HTMLDetailsElement,
          summary_: props.summary,
          is_open_: get_set_function_to_signal(
            () => props.is_open,
            () => props.set_is_open
          ),
        });
        return undefined; // ExpandingDetails just returns wrapper_element so we don't want to add any children here - results in nicer element structure
      },
      props: { ...other_react_props, summary, child_wrapper },
      wrapper_type: "details",
      className: className,
    }),
    reactDom.createPortal(summary_children, summary),
    reactDom.createPortal(children, child_wrapper)
  );
}
