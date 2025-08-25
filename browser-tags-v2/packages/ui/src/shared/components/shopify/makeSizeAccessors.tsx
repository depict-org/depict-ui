import { Accessor, batch, createSignal, onCleanup } from "solid-js";
import { catchify, observer } from "@depict-ai/utilishared";

/**
 * Returns two accessors (one width and one height) that will update when the size of the provided element changes, to be used with ResponsiveImg
 */
export function makeSizeAccessors(whatToWatch: HTMLElement) {
  const [width, setWidth] = createSignal(0);
  const [height, setHeight] = createSignal(0);

  const resizeObserver = new ResizeObserver(
    catchify(records =>
      batch(() => {
        for (let j = 0; j < records.length; j++) {
          const { width, height } = records[j].contentRect;
          // Padding hack makes that we can't use contentRect to get the height since that's apparently without padding
          const definitiveHeight = height || whatToWatch.getBoundingClientRect().height;

          if (definitiveHeight) {
            setHeight(Math.ceil(definitiveHeight));
          }
          if (width) {
            setWidth(Math.ceil(width));
          }
        }
      })
    )
  );

  // If we start observing elements before they're in the DOM Chrome (Version 117.0.5938.92 (Official Build) (arm64)) sometimes gives us a resize event with a width of 0 and then doesn't dispatch one with the actual width once it's in the DOM. So we wait until the element is in the DOM before we start observing it.
  // It doesn't seem to work even when waiting for it to be in the DOM, also wait an animation frame
  const disconnect = observer.onexists(whatToWatch, ({ element }) =>
    requestAnimationFrame(catchify(() => resizeObserver.observe(element)))
  );

  onCleanup(() => {
    resizeObserver.disconnect();
    disconnect();
  });

  return [width, height] as [Accessor<number>, Accessor<number>];
}
