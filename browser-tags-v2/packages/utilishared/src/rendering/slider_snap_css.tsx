import { observer } from "../element-observer";
import { random_string } from "../utilities/random_string";
import { err } from "../deprecated/err";
import { dlog } from "../logging/dlog";
import { Amazing_Slider, Slider_Options } from "./pure_slider";

export function slider_snap_css(
  _t?: any,
  { snapEvery, align }: { snapEvery?: number; align?: "center" | "start" | "end" } = {}
) {
  function constructor_plugin(_slider_options: Slider_Options) {
    const slider_this = this as Amazing_Slider;
    const random_classname = "x" + random_string().replaceAll(".", "");
    slider_this.insert_here.classList.add(random_classname);

    const style = document.createElement("style");
    style.append(
      `.depict .${random_classname}{scroll-snap-type:x mandatory}.depict .${random_classname}>*:nth-child(${
        snapEvery ?? 1
      }n + 1){scroll-snap-align:${align || "start"}}`
    );

    slider_this.snap_style = slider_this.container.appendChild(style);

    can_use_snapping_and_still_scroll()
      .then(we_can => {
        if (!we_can) {
          dlog("Disabling slider snapping due browser where it's impossible to have working buttons and css snapping");
          style.remove();
          delete slider_this["snap_style"];
        }
      })
      .catch(err);
  }

  function mutation_plugin(
    _intersections: IntersectionObserverEntry[],
    intersecting_mutations: Record<number, IntersectionObserverEntry>
  ) {
    // const visible_elems Object.keys(intersecting_mutations).length
  }

  return {
    constructor_plugin,
    mutation_plugin,
  };
}

export async function can_use_snapping_and_still_scroll() {
  if ("scrollBehavior" in document.documentElement.style) {
    return true;
  }
  const test_div = (
    <div style="position: absolute; width: 1em; overflow: scroll; scroll-snap-type: x mandatory;">
      <div style="scroll-snap-align: start; color: transparent;">test</div>
    </div>
  ) as HTMLDivElement;

  const body = await observer.wait_for_element("body");
  body.append(test_div);
  test_div.scrollLeft = 1;
  const can_be_scrolled = test_div.scrollLeft === 1;
  test_div.remove();

  return can_be_scrolled;
}
