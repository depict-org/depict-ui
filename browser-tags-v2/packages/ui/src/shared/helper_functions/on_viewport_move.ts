import { getOwner, onCleanup, runWithOwner } from "solid-js";
import { catchify, observer } from "@depict-ai/utilishared";

/**
 * Listen for "events that could cause the viewport to move" (resize, scroll and orientationchange). Not totally bulletproof (i.e. doesn't trigger when scrollbars get hidden/shown, use a ResizeObserver on body for that), but covers a common usecase.
 * Event handler will get removed on solid-js cleanup
 * @see also guaranteeAlignment
 * @param override_element If you want to listen for events on an element other than window/body
 */
export function on_viewport_move(handler: (event: Event) => void, passive = true, override_element?: Element) {
  const catchified_handler = catchify(handler);
  const owner = getOwner()!;

  // Some customers (e.g. equestrian) have `height: 100%` and/or `overflow-x: hidden` on the body, which means that scroll events won't get dispatched on `window`. The pages who get it on <body> won't get it on `window` and vice-versa, so there shouldn't be a worry about duplicate calling of the handler.
  // Use observer in case that this gets called before body exists
  if (!override_element) {
    const doWithBody = (element: HTMLBodyElement) => {
      element.addEventListener("scroll", catchified_handler, { passive });
      runWithOwner(owner, () => onCleanup(() => element.removeEventListener("scroll", catchified_handler)));
    };
    const { body } = document;
    if (body) {
      // Only start observer if we absolutely need it, for performance
      doWithBody(body as HTMLBodyElement);
    } else {
      const disconnect = observer.onexists<HTMLBodyElement>("body", ({ element }) => doWithBody(element));
      onCleanup(disconnect);
    }
  }

  for (const event of ["resize", "orientationchange", "scroll"]) {
    const listen_on = override_element ?? window;
    listen_on.addEventListener(event, catchified_handler, { passive });
    onCleanup(() => listen_on.removeEventListener(event, catchified_handler));
  }
}
