/** @jsxImportSource solid-js */
import {
  Accessor,
  createEffect,
  createMemo,
  createResource,
  For,
  getOwner,
  JSX as solid_JSX,
  runWithOwner,
} from "solid-js";
import { get_product_id_of_display } from "../../components/PLPResults/get_product_id_of_display";
import { camelCasifyObject, Display, dlog } from "@depict-ai/utilishared";
import { ProductOrLookCardTemplate } from "../../types";
import { unwrap_solid_jsx_element } from "../unwrap_solid_jsx_element";
import { ProductCardIndexProvider } from "../ProductCardIndexContext";
import { promiseSafeStructuredClone } from "../promiseSafeStructuredClone";
import { FeaturedInDisplay } from "@depict-ai/types/api/FeaturedInResponseV3";

let printedCloneError = false;

/**
 * Converts a signal of displays to a signal of a map of displays keyed by product_id
 */
export function key_displays<T extends Display | FeaturedInDisplay>(get_displays_: Accessor<T[]>) {
  const displays_by_key_ = createMemo(() => {
    const displays = get_displays_();
    // We key by product_id because that's what can be used to uniquely identify products
    // This way <For> can optimize the rendering
    const map = new Map<string, T>();
    for (let i = 0; i < displays.length; i++) {
      const display = displays[i];
      const product_id = get_product_id_of_display(display);
      map.set(product_id, display);
    }
    return map;
  });
  return displays_by_key_;
}

const result_ids = ["search_result_id", "product_listing_result_id", "recommendation_id"] as const;
/**
 * Does nothing but render displays. No placeholder stuff. Will throw into enclosing error boundaries.
 */
export function render_displays<T extends Display | FeaturedInDisplay>({
  displays_by_key_,
  product_card_template_,
  do_per_elements_,
  content_blocks_,
}: {
  displays_by_key_: Accessor<Map<string, T>>;
  product_card_template_: ProductOrLookCardTemplate<T>;
  do_per_elements_?: (elements: Element[], index: Accessor<number>) => void;
  content_blocks_?: Accessor<Accessor<((() => solid_JSX.Element) | (() => solid_JSX.Element)[])[]>>;
}) {
  return (
    <For each={[...displays_by_key_().keys()]}>
      {(product_id, index) => {
        const owner = getOwner()!;
        const possible_content_block = createMemo(() => content_blocks_?.()?.()?.[index()]);
        const display_accessor = createMemo<T>(prev => {
          const new_display = displays_by_key_().get(product_id)!;
          if (prev && deep_equal(prev, new_display)) {
            // If displays are identical, they haven't changed due to merchant/market changing OR we made a new query and the displays are the same. Return the old display (same object reference) to avoid re-rendering.
            // This doesn't work if people mutate the displays from within the template but we hope they don't
            // (We can't know if the display changing is due to merchant/market changing or a new query otherwise and don't want to run into https://gitlab.com/depict-ai/depict.ai/-/merge_requests/6890/diffs)
            return prev;
          }
          return new_display;
        });
        const [product_card_resource] = createResource(
          display_accessor, // re-render when the reference to the display object changes
          display => {
            // It's easy for merchants to accidentally mutate the display or some sub-object thereof
            // We had a case on singular where they popped an image url and due to use caching after some time there was no image
            // Attempt cloning the displays if possible (99.9% of the cases probably) and if not, just use the original display

            try {
              // Use promiseSafeStructuredClone so that:
              // 1. When fetching for example prices from an API, one can start that API request
              // 2. Add the promise to the display
              // 3. Already render the product card with placeholders for prices while the price loads
              // 4. When the price loads, re-render the display with the new price
              display = promiseSafeStructuredClone(display);
            } catch (e) {
              if (!printedCloneError) {
                printedCloneError = true;
                dlog(
                  "Can't clone display",
                  display,
                  " (uncloneable objects in it), make sure you don't mutate it in the template since we cache.",
                  e
                );
              }
            }

            let renderingResult: solid_JSX.Element | Promise<solid_JSX.Element>;
            // Wrap the product card in a ProductCardIndexProvider so that the index is available to the product card
            // This is wo we can do intelligent image loading in ShopifyContainedImage without shopify devs having to pass in the index
            // We don't care about the return value of ProductCardIndexProvider because our rendering result might be a promise which solid doesn't support until it has gone through createResource
            ProductCardIndexProvider({
              index_: index,
              get children() {
                // This is the key - the functions called inside of the children getter of the provider are the one that have the context defined in their solid-internal Owner
                renderingResult = product_card_template_(display, {
                  set_on_index_change: fn => runWithOwner(owner, () => createEffect(() => fn(index()))),
                });
                return undefined; // just to satisfy the typing
              },
            });
            // renderingResult is guaranteed to be defined here (if rendering returned something) because the children getter of ProductCardIndexProvider is called synchronously (createRenderEffect is used solid-internally)
            return renderingResult;
          }
        );

        const node_accessor = unwrap_solid_jsx_element(product_card_resource);
        createEffect(() => {
          const product_card_nodes = node_accessor();
          const display = display_accessor();
          const elements: Element[] = [];
          for (let i = 0; i < product_card_nodes.length; i++) {
            const element = product_card_nodes[i];
            if (!(element instanceof Element)) continue;

            elements.push(element);

            // Add tracking ids
            if (!(element instanceof HTMLElement)) continue; // Apparently only HTMLElements have dataset
            for (let i = 0; i < result_ids.length; i++) {
              const id = result_ids[i];
              const value = display[id];
              if (value) {
                Object.assign(element.dataset, camelCasifyObject({ [id]: value }));
              }
            }
          }
          do_per_elements_?.(elements, index);
        });

        return [
          // Show content block before product card, so it's *at* that index
          possible_content_block as unknown as solid_JSX.Element,
          node_accessor as unknown as solid_JSX.Element, // Don't return product_card_resource as calling it could be creating the nodes which would mean we'd be double-creating the nodes,
          // when unwrapping for the tracking and when putting them into the DOM
        ]; // Regarding the as unknown shenanigans: https://github.com/solidjs/solid/releases/tag/v1.7.0
      }}
    </For>
  );
}

// source: https://medium.com/@pancemarko/deep-equality-in-javascript-determining-if-two-objects-are-equal-bf98cf47e934
// deeply diffs two objects
// Modified by chatGPT to not be recursive, since stiga was getting a stack overflow just due to the size of their data
// Modified futher to bias towards saying objects are equal non-primitive objects differ
function deep_equal(obj1: any, obj2: any) {
  const stack = [[obj1, obj2]];

  while (stack.length) {
    const [currentObj1, currentObj2] = stack.pop()!;

    if (currentObj1 === currentObj2) continue;

    if (Array.isArray(currentObj1) && Array.isArray(currentObj2)) {
      if (currentObj1.length !== currentObj2.length) return false;

      for (let i = 0; i < currentObj1.length; i++) {
        stack.push([currentObj1[i], currentObj2[i]]);
      }
    } else if (
      typeof currentObj1 === "object" &&
      typeof currentObj2 === "object" &&
      currentObj1 !== null &&
      currentObj2 !== null
    ) {
      if (Array.isArray(currentObj1) || Array.isArray(currentObj2)) return false;

      const keys1 = Object.keys(currentObj1);
      const keys2 = Object.keys(currentObj2);

      if (keys1.length !== keys2.length || !keys1.every(key => keys2.includes(key))) return false;

      for (let key in currentObj1) {
        if ((result_ids as readonly string[]).includes(key)) continue; // ignore comparing values for keys we know are changing with every request
        stack.push([currentObj1[key], currentObj2[key]]);
      }
    } else if (typeof currentObj1 !== "function" && typeof currentObj2 !== "function") {
      // Claim that all functions are equal, since the only way a function ends up here is because someone added it in the displayTransformer and that shouldn't force us to re-render, right?
      return false;
    }
  }

  return true;
}
