import { Lazyfier } from "./image_lazyloader";
import { Amazing_Slider, Slider_Options } from "./pure_slider";
import { Optional } from "../utilities/optional_type";
import { observer } from "../element-observer";
import { catchify } from "../logging/error";
import { buildThresholdList } from "../utilities/build_threshold_list";

export interface Amazing_Lazy_Slider {
  lazyfier: Lazyfier;
}

export class Amazing_Lazy_Slider extends Amazing_Slider {
  constructor(
    options: Slider_Options,
    lazyfier_options?: Optional<ConstructorParameters<typeof Lazyfier>[0], "container">
  ) {
    super(options);
    const lazy_promise = new Promise(r => {
      observer.onexists(this.insert_here, ({ element, disconnector }) => {
        const i_o = new IntersectionObserver(
          catchify(records => {
            for (const record of records) {
              if (record.intersectionRatio > 0) {
                r(true);
                i_o.disconnect();
                disconnector();
                return;
              }
            }
          }),
          // Fixes https://gitlab.com/depict-ai/depict.ai/-/merge_requests/5816/diffs, don't understand why
          { threshold: buildThresholdList(10) }
        );
        i_o.observe(element);
      });
    });
    this.lazyfier = new Lazyfier({
      container: this.insert_here as HTMLDivElement,
      wait_for_dominsertion: lazy_promise,
      ...(lazyfier_options || {}),
    });
  }
}
