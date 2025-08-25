import { Accessor, createEffect, createMemo, createSignal, untrack } from "solid-js";
import { Display } from "@depict-ai/utilishared";

/**
 * Returns an accessor which says how much of the result cards are currently in the viewport
 */
export function calculate_percentage_in_view<T extends Display>({
  displays_by_key_,
  get_last_result_in_viewport_,
  index_to_target_map_,
  is_loading_,
  get_extra_displays,
  isSliderLayout_,
}: {
  displays_by_key_: Accessor<Map<string, T>>;
  get_last_result_in_viewport_: Accessor<number | undefined>;
  index_to_target_map_: Map<number, Element[]>;
  is_loading_: Accessor<boolean>;
  get_extra_displays: Accessor<T[]>;
  isSliderLayout_: Accessor<boolean>;
}) {
  const [get_has_rendered_toggle, set_has_rendered_toggle] = createSignal(false);

  createEffect(() => {
    // We need this to run after the "render phase"
    get_extra_displays();
    set_has_rendered_toggle(old => !old);
  });

  return createMemo(
    () => {
      const last = get_last_result_in_viewport_();

      // Check if we are past (below) the last result, in that case we want it to count as 100% for a better infinite scroll experience
      past_last_result_check: {
        const elements_of_last_result = index_to_target_map_.get(index_to_target_map_.size - 1);
        if (!elements_of_last_result || isSliderLayout_()) break past_last_result_check;
        if (untrack(is_loading_)) {
          // We're loading, wait check again after we have inserted our new results
          get_has_rendered_toggle();
          break past_last_result_check;
        }
        for (const element of elements_of_last_result) {
          if (document.documentElement.contains(element) && element.getBoundingClientRect().top <= 0) {
            // dlog(element, "which is of last product card is in or above viewport, probably loading more");
            return 100;
          }
        }
      }

      if (isNaN(last!)) {
        return 0;
      }
      if (Math.abs(last!) === Infinity) {
        // No product card in view and not after last card, assume first card
        return 0;
      }
      return (last! / displays_by_key_().size) * 100;
    },
    undefined,
    { equals: false }
  );
}
