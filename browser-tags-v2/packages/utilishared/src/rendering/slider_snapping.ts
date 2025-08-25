import { catchify, report } from "../logging/error";

export function slider_snapping_factory(options: { stepsize?: number; threshold?: number } = {}) {
  const threshold = options.threshold ?? 0.8;

  const ratio_left = {
    ratio: 0,
    element: document.createElement("div"), // createElement is just for typescript
  };
  const ratio_right = {
    ratio: 0,
    element: document.createElement("div"), // createElement is just for typescript
  };
  const lock_on_element = {
    left: ratio_left.element,
    right: ratio_right.element,
    lock_active: false,
  };

  let currently_left = "0";

  function constructor_plugin(slider_options) {
    const { insert_here: sliding } = this;

    const scroll_abs_no_negative = (target: number) => this.scroll_to_abs(target < 0 ? 0 : target); // the slider ignores everything < 0 but we want it to move to the first card

    sliding.addEventListener(
      "mousedown",
      catchify(() => {
        lock_on_element.lock_active = true;
        const starting_ratio_left = ratio_left.ratio;
        lock_on_element.left = ratio_left.element;

        const starting_ratio_right = ratio_right.ratio;
        lock_on_element.right = ratio_right.element;

        const scroll_left_start = sliding.scrollLeft;

        const mouseup_listener = catchify((e: MouseEvent) => {
          lock_on_element.lock_active = false;
          const delta_left = Math.abs(ratio_left.ratio - starting_ratio_left);
          const delta_right = Math.abs(ratio_right.ratio - starting_ratio_right);

          // dlog({ delta_left, delta_right }, "elements", ratio_left.element, ratio_right.element);
          window.removeEventListener("mouseup", mouseup_listener);

          const scrolled_right = sliding.scrollLeft - scroll_left_start > 0;

          if (
            delta_left > threshold ||
            delta_right > threshold ||
            lock_on_element.left != ratio_left.element ||
            lock_on_element.right != ratio_right.element
          ) {
            let currently_visible: number | undefined;
            try {
              currently_visible = Math.floor(
                this.insert_here.getBoundingClientRect().width /
                  this.insert_here.firstElementChild.getBoundingClientRect().width
              );
            } catch (e) {
              report(e, "warning");
            }
            const stepsize = options.stepsize || currently_visible || 4;
            if (scrolled_right) {
              scroll_abs_no_negative(+currently_left + stepsize);
            } else {
              scroll_abs_no_negative(+currently_left - stepsize);
            }
          } else {
            const max_left = sliding.scrollLeft < 1;
            const max_right =
              sliding.scrollLeft >= (sliding.scrollLeftMax || sliding.scrollWidth - sliding.clientWidth);
            if (!(max_right || max_left)) {
              // can't attempt to snap to current position when it's not possible because of an edge card being a half card
              // brought back from the dead from https://gitlab.com/depict-ai/depict.ai/-/blob/f67c67591ab4b3d791a91909dab8fc315c87e64f/browser-tags-v2/src/mq/vasily_rec_bar.ts#L353
              scroll_abs_no_negative(+currently_left);
            }
          }
        });
        window.addEventListener("mouseup", mouseup_listener);
      })
    );
  }

  function find_intersection_ratio(records, target) {
    const target_index = records.map(record => record.target).indexOf(target);
    return records[target_index]?.intersectionRatio || 2; // element is probably no longer visible, return huge ratio
  }

  function mutation_plugin(
    intersections: IntersectionObserverEntry[],
    intersecting_mutations: Record<number, IntersectionObserverEntry>
  ) {
    const keys = Object.keys(intersecting_mutations);
    if (lock_on_element.lock_active) {
      const records = Object.values(intersecting_mutations);
      ratio_left.ratio = find_intersection_ratio(records, lock_on_element.left);
      ratio_right.ratio = find_intersection_ratio(records, lock_on_element.right);
    } else {
      const [index_of_first_intersection] = keys;
      currently_left = index_of_first_intersection;
      const [index_of_last_intersection] = keys.slice(-1);
      const first_intersection = intersecting_mutations[index_of_first_intersection];
      const last_intersection = intersecting_mutations[index_of_last_intersection];
      if (first_intersection) {
        ratio_left.ratio = first_intersection.intersectionRatio;
        ratio_left.element = first_intersection.target;
      }
      if (last_intersection) {
        ratio_right.ratio = last_intersection.intersectionRatio;
        ratio_right.element = last_intersection.target;
      }
    }
  }

  return {
    constructor_plugin: catchify(constructor_plugin),
    mutation_plugin: catchify(mutation_plugin),
  };
}
