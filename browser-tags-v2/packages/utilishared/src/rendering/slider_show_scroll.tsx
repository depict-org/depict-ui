import { Slider_Options } from "./pure_slider";

/**
 *  * Plugin for rendering a scrollbar below the slider that follow the slider position.
 *  * Scroll container class: `depict_slider_scroll`
 *  * Scroll bar class: `depict_slider_scroll_bar`
 * @param options Options for the scrollbar. Add position styling and additional classes.
 */
export function slider_show_scroll(options: {
  add_position_styling: boolean;
  scroll_bar_classes?: string[];
  scroll_container_classes?: string[];
}) {
  function constructor_plugin(_slider_options: Slider_Options) {
    const scroll_bar = (<div class="depict_slider_scroll_bar"></div>) as HTMLDivElement;
    const scroll_container = (<div class="depict_slider_scroll_container"></div>) as HTMLDivElement;

    if (options.scroll_bar_classes?.length) {
      scroll_bar.classList.add(...options.scroll_bar_classes);
    }
    if (options.scroll_container_classes?.length) {
      scroll_container.classList.add(...options.scroll_container_classes);
    }

    // Default styles always present
    scroll_container.style.overflowX = "hidden";
    scroll_bar.style.left = "0";

    if (options.add_position_styling) {
      scroll_bar.style.position = "absolute";
      scroll_container.style.position = "relative";
    }

    scroll_container.append(scroll_bar);
    this.container.append(scroll_container);
    this.scroll_bar = scroll_bar;
  }

  function mutation_plugin(
    _intersections: IntersectionObserverEntry[],
    _intersecting_mutations: Record<number, IntersectionObserverEntry>
  ) {
    const { insert_here: slider } = this;
    const scrolled = (slider.scrollLeft / slider.scrollWidth) * 100;

    this.scroll_bar.style.width = `${Math.round((slider.offsetWidth / slider.scrollWidth) * 100)}%`;
    this.scroll_bar.style.left = `${scrolled}%`;
  }

  return {
    constructor_plugin,
    mutation_plugin,
  };
}
