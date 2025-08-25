import { Accessor, createMemo, Resource, Signal } from "solid-js";

/**
 * Returns number of actually rendered displays when we've finished fetching, otherwise backend n_hits
 */
export function useCountOfProductsForUI(
  plp_products_: Resource<undefined | { n_hits: number }>,
  [allProductsLoaded]: Signal<boolean>,
  currentlyLoadedDisplays: Accessor<number>
) {
  return createMemo(() => {
    const backendSays = plp_products_()?.n_hits;
    const loadedAll = allProductsLoaded();
    if (!backendSays || !loadedAll) return backendSays;
    // People can remove displays in the displayTransformers, for example houdini do it (https://depictaiworkspace.slack.com/archives/C061H2TF7K4/p1713261063439089). Correct the n_hits as well as possible in that case.
    return currentlyLoadedDisplays();
  });
}
