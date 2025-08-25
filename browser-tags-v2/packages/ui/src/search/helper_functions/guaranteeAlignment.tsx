import { Accessor, createEffect, onCleanup } from "solid-js";
import { on_viewport_move } from "../../shared/helper_functions/on_viewport_move";
import { catchify, observer } from "@depict-ai/utilishared";

/**
 * Runs the provided callback functions on every event that conceivably could change elements to change position due to the viewport moving, including scrollbars being hidden/shown, scrolling, resizing, changing orientation, and more.
 * @param callback The function to run, will run at most once per microtask
 * @param alsoRaF If provided and returning true, will run the callback every frame using requestAnimationFrame until disabled
 * @param passiveListener If false, the event listener will not be passive which can lead to worse scrolling performance
 * @returns a function that can be called to manually run the callback (but deduped within the same microtask)
 */
export function guaranteeAlignment(callback: VoidFunction, alsoRaF?: Accessor<boolean>, passiveListener?: boolean) {
  let aligned_this_microtask = false;
  const probablyCallCallback = () => {
    if (aligned_this_microtask) {
      return;
    }
    aligned_this_microtask = true;
    queueMicrotask(() => (aligned_this_microtask = false));
    callback();
  };

  createEffect(() => {
    if (alsoRaF?.()) {
      let disposed = false;
      const fn = catchify(() => {
        if (disposed) return;
        probablyCallCallback();
        requestAnimationFrame(fn);
      });
      fn();
      onCleanup(() => (disposed = true));
    }
  });

  on_viewport_move(probablyCallCallback, passiveListener);
  // "resize" doesn't fire sometimes when it should, also it doesn't when showing/hiding scrollbars which disabling scrolling does
  // this works
  // keeping resize just in case
  const resize_resize_observer = new ResizeObserver(catchify(probablyCallCallback));
  resize_resize_observer.observe(document.documentElement);
  observer.wait_for_element("body").then(resize_resize_observer.observe.bind(resize_resize_observer));
  onCleanup(catchify(() => resize_resize_observer.disconnect()));

  return probablyCallCallback;
}
