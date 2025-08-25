import { createElement, CSSProperties, Fragment, ReactElement, ReactHTML, ReactPortal, useRef } from "react";
import { generateHydrationScript, renderToString } from "solid-js/web";
import { JSX as solid_JSX } from "solid-js";

export function server_wrap_solid_in_react<T extends object>({
  solid_component,
  props,
  wrapper_type = "div",
  wrapper_style = {},
}: {
  solid_component: (props: T, set_portals: (portals: ReactPortal[]) => void) => solid_JSX.Element;
  props: T;
  wrapper_type?: keyof ReactHTML;
  wrapper_style?: CSSProperties;
}): ReactElement {
  const wrapper_element_ref = useRef<HTMLDivElement>();

  // The worst thing that can happen by multiple generateHydrationScript's is that events dispatched before the hydration are duplicated in solid's shared context which leads to them being deduplicated again here https://github.com/ryansolid/dom-expressions/blob/21fdba5bcab25986a2b93003aaace100b2231cdc/packages/dom-expressions/src/client.js#L280
  const rendered_html = generateHydrationScript() + renderToString(() => solid_component(props, () => {}));

  return createElement(
    Fragment,
    null,
    createElement(wrapper_type, {
      ref: wrapper_element_ref,
      style: wrapper_style,
      dangerouslySetInnerHTML: {
        __html: rendered_html,
      },
    })
  );
}
