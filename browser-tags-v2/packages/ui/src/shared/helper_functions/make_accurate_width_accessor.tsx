/** @jsxImportSource solid-js */

import { createSignal, onCleanup } from "solid-js";
import { catchify, observer } from "@depict-ai/utilishared";

/**
 * Returns accessor with the size of the provided element, including padding and border (I think)
 */

export function make_accurate_width_accessor(what_to_watch: HTMLElement) {
  const [width, setWidth] = createSignal<number | undefined>();

  const resizeObserver = new ResizeObserver(
    catchify(records => {
      for (let j = 0; j < records.length; j++) {
        const width = records[j].borderBoxSize?.[0]?.inlineSize ?? what_to_watch.getBoundingClientRect().width;
        setWidth(width);
      }
    })
  );

  // If we start observing elements before they're in the DOM Chrome (Version 117.0.5938.92 (Official Build) (arm64)) sometimes gives us a resize event with a width of 0 and then doesn't dispatch one with the actual width once it's in the DOM. So we wait until the element is in the DOM before we start observing it.
  // It doesn't seem to work even when waiting for it to be in the DOM, also wait an animation frame
  const disconnect = observer.onexists(what_to_watch, ({ element }) =>
    requestAnimationFrame(
      catchify(() => {
        const current_size = what_to_watch.getBoundingClientRect().width;
        if (current_size) {
          // If element has size, set signal to that. ResizeObserver only triggers when the content is visible in some cases, but it might already have a size. This reduces size filter expanding animation jank in chrome.
          setWidth(current_size);
        }
        resizeObserver.observe(element);
      })
    )
  );

  onCleanup(() => {
    resizeObserver.disconnect();
    disconnect();
  });

  return width;
}
