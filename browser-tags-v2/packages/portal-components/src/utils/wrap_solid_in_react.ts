import { JSX as solid_JSX } from "solid-js";
import { render } from "solid-js/web";
import { createElement, CSSProperties, ReactElement, ReactHTML, useEffect, useRef, useState } from "react";
// @ts-ignore - jsx is not included in Reacts typing even though it exists in the module.
// https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html "Inserted by a compiler (don't import it yourself!)"
import { createStore, reconcile } from "solid-js/store";

/**
 * Wraps a solid component in a React component.
 * Make sure you have a matching SSR component that just returns an empty div.
 * @param solid_component The solid component to wrap
 * @param props The props to pass to the solid component, this will be a reactive store
 * @param wrapper_type The type of the React wrapper element
 * @param wrapper_style The style of the React wrapper element
 *
 */
export function wrap_solid_in_react<T extends object>({
  solid_component,
  props,
  wrapper_type = "div",
  wrapper_style = {},
  className,
}: {
  solid_component: (props: T, wrapper_element: HTMLElement) => solid_JSX.Element;
  props: T;
  wrapper_type?: keyof ReactHTML;
  wrapper_style?: CSSProperties;
  className?: string;
}): ReactElement {
  const wrapper_element_ref = useRef<HTMLDivElement>();
  const [[store, write_store]] = useState(() => createStore<T>(props));

  // Update store when props change
  write_store(reconcile(props));

  useEffect(() => {
    const wrapper_element = wrapper_element_ref.current!;
    // If someone only rendered a solid component on the client that *could* be hydrated (no childNodes) then we fall back to `render` to avoid solid complaining about not being able to hydrate or crashing because the result of generateHydrationScript hasn't run at all
    // This can happen for HMR or when SSR capable components are only rendered on the client

    const dispose = render(() => solid_component(store, wrapper_element), wrapper_element);
    return dispose;
  }, []);

  return createElement(wrapper_type, {
    ref: wrapper_element_ref,
    style: wrapper_style,
    className: className,
  });
}
