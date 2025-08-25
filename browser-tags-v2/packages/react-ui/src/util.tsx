import { catchify, instant_exec_on_suspect_history_change } from "@depict-ai/utilishared";
import { globalState } from "./global_state";
import { JSX as solid_JSX, untrack } from "solid-js";
import { hydrate, render } from "solid-js/web";
import {
  createElement,
  CSSProperties,
  Fragment,
  ReactElement,
  ReactHTML,
  ReactPortal,
  useEffect,
  useRef,
  useState,
} from "react";
import { createStore, reconcile } from "solid-js/store";

let run_on_href_change: undefined | ((href: string) => void);
let old_href = location.href;

/** This will run your callback before any search stuff that also listens on instant_exec_on_suspect_history_change (hopefully) */
export function set_run_on_href_change(cb: (href: string) => void) {
  run_on_href_change = cb;
}

instant_exec_on_suspect_history_change.add(
  catchify(() => {
    const { href } = location;
    if (run_on_href_change && old_href !== href) {
      run_on_href_change(href);
    }
    old_href = href;
  })
);

export const is_search_page = (url: Location | URL = location) =>
  url.pathname == untrack(globalState.search_page_path_[0]); // might have changed therefore get it from globalState

export const is_category_page = (url: Location | URL = location) => globalState.known_category_paths.has(url.pathname);

/**
 * Wraps a solid component in a React component.
 * Make sure you have a matching SSR component that just returns an empty div.
 * Currently, *does not* support reactive props - the solid component will always get the first version of the props.
 * @param solid_component The solid component to wrap
 * @param props The props to pass to the solid component, this will be a reactive store
 * @param wrapper_type The type of the React wrapper element
 * @param wrapper_style The style of the React wrapper element
 * @param hydrate_function_when_ssr The render function defaults to solid-js/web's render. For SSR, you can pass hydrate from solid-js/web here instead of a boolean switch, for tree-shaking reasons.
 *
 */
export function wrap_solid_in_react<T extends object>({
  solid_component,
  props,
  wrapper_type = "div",
  wrapper_style = {},
  hydrate_function_when_ssr,
}: {
  solid_component: (props: T, set_portals: (portals: ReactPortal[]) => void) => solid_JSX.Element;
  props: T;
  wrapper_type?: keyof ReactHTML;
  wrapper_style?: CSSProperties;
  hydrate_function_when_ssr?: typeof hydrate;
}): ReactElement {
  const [portals, set_portals] = useState([] as ReactPortal[]);
  const wrapper_element_ref = useRef<HTMLDivElement>();
  const [[store, write_store]] = useState(() => createStore<T>(props));

  // Update store when props change
  write_store(reconcile(props));

  useEffect(() => {
    let gotDisposed = false;
    const wrapper_element = wrapper_element_ref.current!;
    // If someone only rendered a solid component on the client that *could* be hydrated (no childNodes) then we fall back to `render` to avoid solid complaining about not being able to hydrate or crashing because the result of generateHydrationScript hasn't run at all
    // This can happen for HMR or when SSR capable components are only rendered on the client

    const render_function =
      hydrate_function_when_ssr && wrapper_element.childNodes.length ? hydrate_function_when_ssr : render;

    // Our system of suppressing hydration warnings and SSR-ing seems to generally work (all the time also in our test storefronts)
    // But sometimes in prod (see https://depictaiworkspace.slack.com/archives/C061PGT2N3A/p1702038855265339) react for some reason actually sets innerHTML = ""; on our wrapper
    // Deleting all our elements. To prevent that we just patch innerHTML to not do anything when being set to a new value
    if (hydrate_function_when_ssr && !Object.getOwnPropertyNames(wrapper_element).includes("innerHTML")) {
      Object.defineProperty(wrapper_element, "innerHTML", {
        configurable: false,
        enumerable: true,
        get() {
          return Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML")?.get?.call(wrapper_element);
        },
        set() {
          // Do nothing
        },
      });
    }

    const dispose = render_function(
      () => solid_component(store, newPortals => !gotDisposed && set_portals(newPortals)),
      wrapper_element
    );
    return () => {
      // Try being stupid react strict mode re-running effect proof https://legacy.reactjs.org/docs/strict-mode.html#ensuring-reusable-state
      // And https://github.com/facebook/react/issues/24502
      dispose();
      // Nuke absolutely everything when this effect gets torn down so that we don't have any stale state or portals
      gotDisposed = true;
      wrapper_element.replaceChildren();
      set_portals([]);
    };
  }, []);

  return createElement(
    Fragment,
    null,
    createElement(wrapper_type, {
      ref: wrapper_element_ref,
      style: wrapper_style,
      ...(hydrate_function_when_ssr
        ? {
            // We need this because on the server we put the solid SSR rendered string into html but it won't match on the client, luckily we can just suppress it
            suppressHydrationWarning: true,
            dangerouslySetInnerHTML: {
              __html: "",
            },
          }
        : {}),
    }),
    ...portals
  );
}
