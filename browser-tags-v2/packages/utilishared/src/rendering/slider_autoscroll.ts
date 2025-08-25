import { catchify } from "../logging/error";
import { Amazing_Slider } from "./pure_slider";

export function slider_autoscroll_factory(interval: number = 5000) {
  let timer: ReturnType<typeof setInterval>;
  let direction = 1;

  function interval_scroll(this: Amazing_Slider) {
    timer = setInterval(() => {
      this.scroll_to_rel(this.stepstoslide * direction);
    }, interval);
  }

  function mutation_plugin(
    this: Amazing_Slider,
    _intersections: IntersectionObserverEntry[],
    intersecting_mutations: Record<number, IntersectionObserverEntry>
  ) {
    clearInterval(timer);
    const visible_els = Object.keys(intersecting_mutations).map(v => +v);
    if (visible_els.includes(this.index_of_last_element)) {
      direction = -1;
    } else if (visible_els.includes(0)) {
      direction = 1;
    }
    interval_scroll.call(this);
  }

  return {
    constructor_plugin(this: Amazing_Slider) {
      const set_scroll_int = interval_scroll.bind(this);
      this.container.addEventListener(
        "click",
        catchify(() => {
          clearInterval(timer);
          set_scroll_int();
        })
      );
      this.container.addEventListener(
        "mousedown",
        catchify(() => {
          clearInterval(timer);
        })
      );
      set_scroll_int();
    },
    mutation_plugin,
  };
}
