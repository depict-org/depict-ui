import { Slider_Options } from "./pure_slider";
import { err } from "../deprecated/err";
import { catchify } from "../logging/error";
import { dlog } from "../logging/dlog";

export function slider_fractional_factory(
  _t?: any,
  fraction = 1,
  max_steps?: number,
  dont_enable_correct_bs_targets?: boolean,
  min_steps?: number
) {
  function constructor_plugin(slider_options: Slider_Options) {
    const fallback_stepsize = slider_options.stepstoslide || 2;
    const { insert_here: sliding } = this;

    if (!dont_enable_correct_bs_targets) {
      this.correct_bs_targets = true;
    }

    Object.defineProperty(this, "stepstoslide", {
      configurable: true,
      enumerable: true,
      set(v) {
        err(new Error("Cannot set steps to slide manually when using fractional scroll"));
        return v;
      },
      get: catchify(() => {
        const sliding_width = sliding.getBoundingClientRect().width;
        const first_rec = sliding.firstElementChild;
        if (!first_rec) {
          // maybe slider has no elements
          return fallback_stepsize;
        }
        const width_of_first = first_rec.getBoundingClientRect().width;
        const calculated_stepsize = Math.round(Math.floor(sliding_width / width_of_first) * fraction);
        // dlog("calculated stepsize is", calculated_stepsize);
        const stepsize_limited_up = max_steps && calculated_stepsize > max_steps ? max_steps : calculated_stepsize;
        const stepsize_limited_up_and_down =
          min_steps && stepsize_limited_up < min_steps ? min_steps : stepsize_limited_up;
        const stepby = stepsize_limited_up_and_down || fallback_stepsize;

        if (stepby != calculated_stepsize) {
          dlog("going by", stepby, "because of max_steps or invalid stepsize");
        }
        return stepby;
      }),
    });
  }

  function mutation_plugin(
    intersections: IntersectionObserverEntry[],
    intersecting_mutations: Record<number, IntersectionObserverEntry>
  ) {}

  return {
    constructor_plugin,
    mutation_plugin,
  };
}
