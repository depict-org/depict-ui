import { onCleanup } from "solid-js";
import { catchify, dlog } from "@depict-ai/utilishared";

/**
 * Disables scrolling until the solidjs reactive scoped is disposed (onCleanup)
 * @returns A cleanup function to manually re-enable scrolling.
 */
export function disable_scrolling() {
  const cleanup_fns: (() => void)[] = [];

  const cleanup = () => cleanup_fns.forEach(f => f());
  // use an animation to automatically retain the `overflow` values and all other styling
  for (const element of [document.documentElement, document.body]) {
    try {
      const animation = element.animate({ overflow: "hidden", offset: 0 }, 1);
      animation.pause();
      const fn = catchify(animation.play.bind(animation));
      cleanup_fns.push(fn);
      onCleanup(fn);
    } catch (e) {
      dlog("Probably partial keyframe error", e);
    }
    if (getComputedStyle(element).overflow !== "hidden") {
      // safari gets special hacky treatment
      const style = element.style;
      const original_value = style.overflow;
      style.overflow = "hidden";
      const fn = catchify(() => (style.overflow = original_value));
      cleanup_fns.push(fn);
      onCleanup(fn);
    }
  }
  return cleanup;
}

// the way that houdini does that (FYI) it fixes the page jumps
// const from_top = scrollY;
// document.body.style.position = "fixed";
// document.body.style.left = 0;
// document.body.style.right = 0;
// document.body.style.top = `-${from_top}px`;
// document.body.style.overflowY = "scroll";
