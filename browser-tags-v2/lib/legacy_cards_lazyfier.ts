import { catchify, Lazyfier, observer } from "@depict-ai/utilishared/latest";

/**
 * @deprecated
 * The SDK no longer uses our own Lazyfier, but frontend integrations still rely on it for our own product card templates.
 * Import this to get the old behavior.
 */
export function emulate_legacy_cards_lazyfier_behavior() {
  // Lazy loading of images for the SDK
  // copied from RecommendationGrid
  // convoluted lazy loading that
  // when the elements are in the DOM starts IntersectionObserver on whole grid
  // when grid intersects starts Lazyfier
  // this is because Lazyfier is fucking stupid
  const is_watched = new Set<Element>();
  observer.onexists(".depict.plp .cards", ({ element: cards }) => {
    if (is_watched.has(cards)) return; // Just in case someone removes and re-inserts

    let start_lazy_loading: Function;
    const lazy_loading_promise = new Promise(r => (start_lazy_loading = r));
    const lf = new Lazyfier({
      only_load_intersecting: true,
      wait_for_dominsertion: lazy_loading_promise,
      ignore_data_urls: true,
      lazyfinder: { unload() {} },
    });
    lf.start_observing_for_new_children_(cards);

    const i_o = new IntersectionObserver(
      catchify(records => {
        for (const record of records) {
          if (record.intersectionRatio > 0) {
            start_lazy_loading();
            i_o.disconnect();
            return;
          }
        }
      })
    );
    i_o.observe(cards);
    is_watched.add(cards);

    observer.onremoved(cards, ({ element }) => {
      if (document.documentElement.contains(element)) return; // We got re-inserted already
      lf?.intersection_observer?.disconnect?.();
      is_watched.delete(element);
    });
  });
}
