import { Dispatch, ReactNode, ReactPortal, SetStateAction, useEffect, useState } from "react";
import { Accessor, createEffect, createSignal, getOwner, on, onCleanup, runWithOwner, untrack } from "solid-js";
// @ts-ignore - jsx is not included in Reacts typing even though it exists in the module.
import { jsx as react_JSX } from "react/jsx-runtime";
// https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html "Inserted by a compiler (don't import it yourself!)"
import { ReactErrorBoundary } from "../ReactErrorBoundary";
import * as reactDom from "react-dom";
import { ProductCardError } from "@depict-ai/ui";

/**
 * Renders a React component that's a product card or a content block with provided props
 */
export async function render_display_or_block_from_react_template<T extends Record<string, any>>({
  component_props,
  component_portals,
  set_portals,
  get_react_template,
  set_on_index_change_,
}: {
  component_props: T;
  component_portals: Set<ReactPortal>;
  get_react_template: Accessor<(props: T & { index: number }) => ReactNode>;
  set_portals: (portals: ReactPortal[]) => void;
  /**
   * If set (comes from ui product card rendering), will be used to provide a "reactive" index in the props of the react product card component
   */
  set_on_index_change_?: (fn: (index: number) => void) => void;
}) {
  let set_react_has_ran_hooks: () => void;
  let was_cleaned_up = false;
  const react_has_ran_hooks = new Promise<void>(r => (set_react_has_ran_hooks = r));
  const solid_container = document.createElement("div");
  const [setIndexFunctionAccessor, setIndexFunctionSetter] = createSignal<(index: number) => void>();
  let call_when_template_changes: Dispatch<SetStateAction<(props: T & { index: number }) => ReactNode>> | undefined;
  const owner = getOwner();

  const reactProductCard = react_JSX(props => {
    // Sneak in a hook into their product card component to know once react has finished rendering and running hooks
    useEffect(set_react_has_ran_hooks, []);
    const [react_template, set_react_template] = useState<ReturnType<typeof get_react_template>>(() =>
      untrack(get_react_template)
    );
    const [index, setIndex] = useState(0);
    setIndexFunctionSetter(() => setIndex);
    call_when_template_changes = set_react_template;
    return react_template(set_on_index_change_ ? { ...props, index } : props);
  }, component_props);
  const reactProductCardInErrorBoundary = react_JSX(ReactErrorBoundary, {
    children: reactProductCard,
    on_error: (error: Error) =>
      runWithOwner(owner, () => {
        if (was_cleaned_up) return; // Would infinite loop if we'd throw after we've already been cleaned up. That is because the `ErrorBoundary` won't be "registered" with the cleaned-up owner anymore so react would hear about the throw and attempt to re-render the error boundary or something which would throw again, etc.
        throw new ProductCardError(error);
      }),
  });
  const portal = reactDom.createPortal(reactProductCardInErrorBoundary, solid_container);
  component_portals.add(portal);
  set_portals([...component_portals]);

  set_on_index_change_?.(newIndex => setIndexFunctionAccessor()?.(newIndex));

  createEffect(
    on(
      get_react_template,
      new_template =>
        queueMicrotask(
          () =>
            // When the parent react component re-executes and provides a new product card, we want our react portal to also re-render
            // if we update the state inside the portal synchronously from the parent call react gets confused with "Warning: Cannot update a component (`Unknown`) while rendering a different component (`$48d7f568740a317d$export$f7d2f673fc2f091d`). To locate the bad setState() call inside `$48d7f568740a317d$export$f7d2f673fc2f091d`, follow the stack trace as described in https://reactjs.org/link/setstate-in-render"
            // Therefore do it after a microtask to evade detection
            call_when_template_changes?.(() => new_template)
        ),
      {
        defer: true,
      }
    )
  ); // If we get a new template. call the useState hook thing so we correctly re-execute with the new template

  onCleanup(() => {
    was_cleaned_up = true;
    // this will stop working after any await so be careful to not await before this, or you'll have to carry the owner over with getOwner and runWithOwner
    component_portals.delete(portal);
    // Updating i.e. the merchant will cause a setState call while rendering the DepictProvider component which is illegal because it usually infinite loops react apps. In our case it doesn't though, so we just evade detection by doing it a microtask later. See also https://github.com/facebook/react/issues/18178#issuecomment-595846312
    queueMicrotask(() => set_portals([...component_portals]));
  });

  await react_has_ran_hooks; // After React has created elements it still takes some time to actually connect the refs and run the hooks. We don't want to replace placeholders before then.
  return [solid_container];
}
