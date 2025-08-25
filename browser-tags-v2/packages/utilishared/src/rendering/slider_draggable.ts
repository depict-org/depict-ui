// // You need to do this on all elements you insert into the slider before you insert them:
//
// querySelectorAllElements(rendered_slider, ".rec_outer, img, canvas").forEach(el => {
//   el.draggable = false;
//   el.addEventListener("dragstart", e => {
//     e.preventDefault();
//     return false; // https://stackoverflow.com/questions/26356877/html5-draggable-false-not-working-in-firefox-browser
//   });
// });

import { querySelectorAllElements } from "../utilities/common_noapi";
import { catchify } from "../logging/error";
import { dlog } from "../logging/dlog";
import { err } from "../deprecated/err";

export function slider_draggable_factory() {
  function constructor_plugin(slider_options) {
    const { insert_here: sliding } = this;

    let last_mouse_position = 0;
    let starting_position = 0;
    let block_anchor_clicks = false;

    sliding.addEventListener(
      "mousedown",
      catchify((e: MouseEvent) => {
        sliding.classList.remove("slider_snap");
        const { snap_style } = this;
        if (snap_style) {
          snap_style.remove();
        }
        sliding.classList.add("grabbing");
        last_mouse_position = starting_position = e.clientX;
        sliding.addEventListener("mousemove", scroll_on_mousemove);
      })
    );

    window.addEventListener(
      "mouseup",
      catchify((e: MouseEvent) => {
        // use window to prevent dragging from getting stuck
        sliding.classList.remove("grabbing");
        sliding.classList.add("slider_snap");
        sliding.removeEventListener("mousemove", scroll_on_mousemove);

        // readd snap css if needed
        const { snap_style } = this;
        if (snap_style) {
          this.container.append(snap_style);
          // make a scroll so the browser snaps
          // it doesn't snap smoothly. Fuck.
          sliding.scrollBy({
            left: 0,
            top: 0,
            behavior: "smooth",
          });
        }
      })
    );

    sliding.addEventListener(
      "click",
      catchify((e: MouseEvent) => {
        if (block_anchor_clicks) {
          dlog("Block anchor clicks is true, blocking click", e);
          block_anchor_clicks = false;
          e.preventDefault();
          return false;
        }
      })
    );

    function scroll_on_mousemove(e) {
      try {
        const { clientX } = e;

        if (Math.abs(clientX - starting_position) > 10) {
          block_anchor_clicks = true;
        }

        sliding.scrollBy({
          left: last_mouse_position - clientX,
        });

        last_mouse_position = clientX;
      } catch (e) {
        err(e);
      }
    }
  }

  function mutation_plugin(
    intersections: IntersectionObserverEntry[],
    intersecting_mutations: Record<number, IntersectionObserverEntry>
  ) {}

  function instant_post_pro(items: HTMLCollection) {
    querySelectorAllElements(items, "a, img, canvas").forEach(el => {
      // @ts-ignore
      el.draggable = false;
      el.addEventListener("dragstart", e => {
        e.preventDefault();
        return false; // https://stackoverflow.com/questions/26356877/html5-draggable-false-not-working-in-firefox-browser
      });
    });
  }

  return {
    constructor_plugin,
    mutation_plugin,
    post_pro_plugin: {
      instant: instant_post_pro,
    },
  };
}
