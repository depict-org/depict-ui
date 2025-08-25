import { catchify, Display } from "@depict-ai/utilishared";
import { FeaturedInDisplay } from "@depict-ai/types/api/FeaturedInResponseV3";
import {
  Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  JSX as solid_JSX,
  onCleanup,
  Setter,
  untrack,
  useContext,
} from "solid-js";
import { ProductOrLookCardTemplate } from "../../types";
import { render_displays } from "./render_displays";
import { useProductCardIndex } from "../ProductCardIndexContext";
import { isServer } from "solid-js/web";

export const CurrentlyIntersectingContext = /*@__PURE__*/ createContext<{
  currentlyIntersecting_: Accessor<Set<number>>;
  setIsListening_: Setter<number>;
}>();

/**
 * Calls renderDisplays but also starts an IntersectionObserver, and wraps renderDisplays in a provider that lets anything below it gets if it's in the viewport or not.
 *
 * Will only observe items if either `useProductCardIsVisible` was called in any of the product cards rendered or `alwaysObserveCards_` is true. When not observing, indexToTargetMap_ will not be accurate.
 */
export function renderDisplaysWithIntersectionObserver<T extends Display | FeaturedInDisplay>({
  displays_by_key_,
  product_card_template_,
  content_blocks_,
  alwaysObserveCards_,
}: {
  displays_by_key_: Accessor<Map<string, T>>;
  product_card_template_: ProductOrLookCardTemplate<T>;
  content_blocks_?: Accessor<Accessor<((() => solid_JSX.Element) | (() => solid_JSX.Element)[])[]>>;
  alwaysObserveCards_?: boolean;
}) {
  const targetToIndexMap_ = new Map<Element, number>();
  const indexToTargetMap_ = new Map<number, Element[]>();
  const [listenersForIntersecting, setListenersForIntersecting] = createSignal<number>(0);
  const [currentlyIntersecting, setCurrentlyIntersecting] = createSignal<Set<number>>(new Set<number>(), {
    equals: false,
  });
  if (isServer) {
    return {
      renderedDisplays_: render_displays<T>({
        displays_by_key_,
        product_card_template_,
        content_blocks_,
      }),
      indexToTargetMap_,
      currentlyIntersecting,
    };
  }
  // The following sets up an intersection observer to determine which results are in the viewport, used for the ScrollStatus indicator, knowing when to load more and any other consumer of the useProductCardIsVisible hook.
  const shouldObserve = createMemo(() => alwaysObserveCards_ || listenersForIntersecting() > 0);
  const intersection_observer = new IntersectionObserver(
    catchify(records => {
      const intersectingValue = currentlyIntersecting();
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const { target, intersectionRatio } = record;
        const index_of_target = targetToIndexMap_.get(target);
        if (index_of_target == undefined) return; // It seems like it can happen that we get IntersectionObserverEntries after the onCleanup function for a recommendation card has run, in Firefox. Probably a bug in Firefox? If I understood the bug correctly, this is a workaround.
        const is_in_set = intersectingValue.has(index_of_target);

        if (intersectionRatio > 0) {
          if (!is_in_set) {
            intersectingValue.add(index_of_target);
          }
        } else {
          if (is_in_set) {
            intersectingValue.delete(index_of_target);
          }
        }
      }

      setCurrentlyIntersecting(intersectingValue);
    }, "renderDisplays IO failed")
  );
  const renderedDisplays_ = (
    <CurrentlyIntersectingContext.Provider
      value={{ currentlyIntersecting_: currentlyIntersecting, setIsListening_: setListenersForIntersecting }}
    >
      {render_displays<T>({
        displays_by_key_,
        product_card_template_,
        content_blocks_,
        do_per_elements_: (elements, index_accessor) =>
          // Adds/removes elements from the "results in viewport" intersection observer above
          createEffect(() => {
            if (!shouldObserve()) return;
            const display_index = index_accessor();
            // Nested createEffect because we only want to re-run this when the index changes (or we should/shouldn't observe)
            // We need to save in a map which index the elements of this template are so that we can know that in the IntersectionObserver callback
            for (let i = 0; i < elements.length; i++) {
              const element = elements[i];
              targetToIndexMap_.set(element, display_index);
              intersection_observer.observe(element);
              onCleanup(() => {
                intersection_observer.unobserve(element);
                targetToIndexMap_.delete(element);
                const intersecting = untrack(currentlyIntersecting);
                const wasDeleted = intersecting.delete(display_index);
                if (wasDeleted) {
                  setCurrentlyIntersecting(intersecting);
                }
              });
            }
            indexToTargetMap_.set(display_index, elements);
            onCleanup(() => indexToTargetMap_.delete(display_index));
          }),
      })}
    </CurrentlyIntersectingContext.Provider>
  );

  return { renderedDisplays_, indexToTargetMap_, currentlyIntersecting };
}

/**
 * Returns an accessor that says if said product card is in the viewport or not, when ran within a product card. Throws if not ran within a product card.
 */
export function useProductCardIsVisible() {
  const { setIsListening_, currentlyIntersecting_ } = useContext(CurrentlyIntersectingContext) || {};
  const getOurIndex = useProductCardIndex();
  const isVisible = createMemo(() => currentlyIntersecting_?.().has(getOurIndex?.() as number));

  setIsListening_?.(prev => prev + 1);
  onCleanup(() => setIsListening_?.(prev => prev + 1));

  return isVisible;
}
