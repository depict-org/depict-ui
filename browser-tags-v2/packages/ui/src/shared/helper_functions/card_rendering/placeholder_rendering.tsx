/** @jsxImportSource solid-js */
import {
  Accessor,
  createMemo,
  createRenderEffect,
  createResource,
  createRoot,
  createSignal,
  Index,
  JSX as solid_JSX,
  onCleanup,
  untrack,
} from "solid-js";
import { Display } from "@depict-ai/utilishared";
import { ProductOrLookCardTemplate } from "../../types";
import { unwrap_solid_jsx_element } from "../unwrap_solid_jsx_element";
import { isServer } from "solid-js/web";
import { FeaturedInDisplay } from "@depict-ai/types/api/FeaturedInResponseV3";

const defaultCacheKey = /*@__PURE__*/ Symbol();
const cachedPlaceholderElements: Record<symbol, ReturnType<ReturnType<typeof unwrap_solid_jsx_element>> | undefined> =
  {};
const renderingCachedPlaceholderElement: Record<symbol, PromiseLike<solid_JSX.Element> | undefined> = {};

/**
 * Create as many <Placeholder>s as needed due to scroll_restoration_data_ or more
 */
export function Placeholders<T extends Display | FeaturedInDisplay>({
  product_card_template_,
  num_placeholders_,
  content_blocks_,
  placeholderCacheKey_,
}: {
  product_card_template_: ProductOrLookCardTemplate<T>;
  num_placeholders_: Accessor<number>;
  content_blocks_?: Accessor<Accessor<((() => solid_JSX.Element) | (() => solid_JSX.Element)[])[]>>;
  placeholderCacheKey_?: symbol;
}) {
  const [num_to_actually_show, set_num_to_actually_show] = createSignal(untrack(num_placeholders_));

  if (isServer) {
    // want to render simple placeholders on server, effects don't run there
    // FIXME when adding proper SSR: also SSR content blocks
    return createMemo(() =>
      Array.from({ length: num_placeholders_() }).map(() => {
        const template_result = product_card_template_(null, undefined);
        // @ts-ignore
        if (typeof template_result?.then !== "function") {
          return template_result;
        }
      })
    ) as unknown as solid_JSX.Element;
  }

  createRenderEffect(() => {
    const existing_num = num_to_actually_show();
    const to_add = num_placeholders_() - existing_num;
    if (to_add <= 0) {
      return;
    }
    // Below comment is from when we used recommendation renderer and manual DOM manipulation for this, but I'm still scared to remove placeholders and mess up scroll restoration, so I'm keeping the way it worked. Otherwise, <Index> could be used which would be far more elegant.
    // We don't need to remove placeholders, only need to add. The reason for that is that chrome restores the scroll position once all tasks queued as reaction of the "popstate" events have been completed in the task queue. That means that we need to get the placeholders in fast, or we might lose scroll position if the previous site was shorter.
    // The query id and the amount might update in separate tasks because one comes from href_change_ipns and the other one from another "popstate" listener. Therefore, we need to be able to dynamically add more placeholders. I'm not entirely sure about this anymore though, since we have the scroll position on a per-id basis it might work anyway but THIS WORKS, and I've been working on this bug for 3 hours so let's just keep it this way.
    // Above comments were from when we added elements in this createRenderEffect. Now I changed it to just increment the number and render them from an <Index> instead, so I can add content blocks better
    // Functionality should be the same

    set_num_to_actually_show(existing_num + to_add);
  });

  return (
    <Index each={Array.from({ length: num_to_actually_show() })}>
      {(_item, index) => {
        const possible_content_block = createMemo(() => content_blocks_?.()?.()?.[index]);
        // Show content block before product card, so it's *at* that index
        return [
          possible_content_block as unknown as solid_JSX.Element,
          Placeholder({ product_card_template_, placeholderCacheKey_ }),
        ]; // https://github.com/solidjs/solid/releases/tag/v1.7.0
      }}
    </Index>
  );
}

/**
 * Get one placeholder element. It will be cloned for each placeholder for ultimate performance even when solid-js isn't rendering the placeholders.
 */
function Placeholder<T extends Display | FeaturedInDisplay>({
  product_card_template_,
  placeholderCacheKey_ = defaultCacheKey,
}: {
  product_card_template_: ProductOrLookCardTemplate<T>;
  placeholderCacheKey_?: symbol;
}) {
  const get_cloned_placeholders = (element_to_clone = cachedPlaceholderElements[placeholderCacheKey_]) =>
    Array.isArray(element_to_clone)
      ? element_to_clone.map(el => (el instanceof Node ? el.cloneNode(true) : el))
      : element_to_clone;

  if (cachedPlaceholderElements[placeholderCacheKey_]) {
    return get_cloned_placeholders();
  }

  let dispose_original_copy: VoidFunction;
  const get_unwrapped_element = createRoot(dispose => {
    dispose_original_copy = dispose;
    // if product_card_template_ is async and rejects the resource will take care of throwing upwards here in the solid-js error handling system
    const [resource] = createResource(() => {
      const rendering_cached_placeholder_element = renderingCachedPlaceholderElement[placeholderCacheKey_];
      if (rendering_cached_placeholder_element) {
        return rendering_cached_placeholder_element as Promise<solid_JSX.Element>;
      }
      const return_value = product_card_template_(null, undefined);
      if (typeof return_value === "object" && typeof (return_value as any)?.then === "function") {
        // Is Promise or promise-like object
        renderingCachedPlaceholderElement[placeholderCacheKey_] = return_value as PromiseLike<solid_JSX.Element>;
      }
      return return_value;
    });
    return createMemo(() => {
      if (resource.loading) {
        return () => [];
      }
      return unwrap_solid_jsx_element(resource);
    });
  });

  onCleanup(() => {
    const rendering = renderingCachedPlaceholderElement[placeholderCacheKey_];
    if (rendering) {
      // If we're still rendering in our separate root, let the rendering finish or other <Placeholder> components waiting for it might get an incomplete result
      const unset_current_rendering = () => {
        dispose_original_copy();
        renderingCachedPlaceholderElement[placeholderCacheKey_] = undefined;
      };
      rendering?.then(unset_current_rendering, unset_current_rendering);
    } else {
      // Otherwise, just make sure we've disposed our root
      dispose_original_copy();
    }
  });

  return createMemo(() => {
    const unwrapped_array = get_unwrapped_element()();

    if (!unwrapped_array?.length || !unwrapped_array.every(item => item)) {
      // Haven't finished rendering yet in case of "async" rendering, so don't freeze the elements yet
      return;
    }

    // placeholders have finished rendering, freeze the elements
    // here we might receive the result of a promise that has already been received, tore down and put into cached_placeholder_element, so don't overwrite that more valid result if it's already set
    cachedPlaceholderElements[placeholderCacheKey_] ||= get_cloned_placeholders(unwrapped_array); // Clone initial return value so that who gave us the elements can't mutate them, which has caused issues before with react
    renderingCachedPlaceholderElement[placeholderCacheKey_] = undefined;

    dispose_original_copy(); // So that this memo will never re-run and the placeholder rendering function can clean up

    return get_cloned_placeholders(); // clone, just in case. If we wouldn't, someone could modify the copy in the DOM, and it would affect the cached version
  }) as unknown as solid_JSX.Element;
}
