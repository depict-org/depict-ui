import { Amazing_Slider, Slider_Options } from "./pure_slider";

export function slider_fading_factory({
  fade_in_duration_ = 0,
  fade_out_duration_ = 0,
  visible_opacity_ = 1,
  faded_opacity_ = 0.5,
  easing_ = "linear",
  threshold_ = 0.5,
}: {
  fade_in_duration_?: number;
  fade_out_duration_?: number;
  visible_opacity_?: number;
  faded_opacity_?: number;
  easing_?: string;
  threshold_?: number;
} = {}) {
  const faded_els = /*@__PURE__*/ new WeakSet<Element>();

  function mutation_plugin_(
    this: Amazing_Slider,
    entries: IntersectionObserverEntry[],
    _intersecting_mutations: Record<number, IntersectionObserverEntry>
  ) {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const { target } = entry;
      const should_be_faded = entry.intersectionRatio <= threshold_;
      if (should_be_faded !== faded_els.has(target)) {
        faded_els[should_be_faded ? "add" : "delete"](target);
        // try to fix https://sentry.io/organizations/depictai-0o/issues/3391798259/?project=5476183&query=is%3Aunresolved+animate&statsPeriod=14d
        target.animate(
          {
            opacity: [
              should_be_faded ? visible_opacity_ : faded_opacity_,
              should_be_faded ? faded_opacity_ : visible_opacity_,
            ],
          },
          { fill: "forwards", duration: should_be_faded ? fade_out_duration_ : fade_in_duration_, easing: easing_ }
        );
      }
    }
  }

  function constructor_plugin(this: Amazing_Slider, _slider_options: Slider_Options) {
    // Fade in removed elements as they may be added somewhere else in the DOM
    this.on_elements_changed.push(records => {
      for (const { removedNodes } of records) {
        for (const node of removedNodes) {
          if (faded_els.has(node as Element)) {
            faded_els.delete(node as Element);
            (node as Element).animate(
              {
                opacity: [faded_opacity_, visible_opacity_],
              },
              { fill: "forwards", duration: fade_in_duration_, easing: easing_ }
            );
          }
        }
      }
    });
  }

  return {
    mutation_plugin_,
    constructor_plugin,
  } as const;
}
