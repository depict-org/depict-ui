import { catchify, dlog } from "@depict-ai/utilishared/latest";
import { createEffect, createRoot, createSignal, onCleanup, Signal } from "solid-js";

let elementsHoveredSignal: Signal<Set<Element>> | undefined;
let consumersSignal: Signal<number> | undefined;

/**
 * Returns a set containing the element where every element currently touching the screen started touching it.
 */
export function useMobileHover() {
  if (!elementsHoveredSignal || !consumersSignal) {
    createRoot(dispose => {
      elementsHoveredSignal = createSignal(new Set<Element>());
      consumersSignal = createSignal<number>(0);
      const [consumers] = consumersSignal;

      // No matter how often useMobileHover is called, only add one listener and get hovered elements once per touchmove event, for efficiency
      doHeavyCalculations();

      createEffect(() => {
        // No-one needs information anymore, stop listening
        const users = consumers();
        if (users < 1) {
          dlog("Stopping to listen for mobile hover");
          dispose();
          elementsHoveredSignal = undefined;
          consumersSignal = undefined;
        }
      });
    });
  }

  const [elementsHovered] = elementsHoveredSignal!;
  const [, setConsumers] = consumersSignal!;

  setConsumers(prev => prev + 1);
  onCleanup(() => setConsumers(prev => (prev as number) - 1));

  return elementsHovered;
}

function doHeavyCalculations() {
  dlog("Starting to listen for mobile hover");
  const [, setElementsHovered] = elementsHoveredSignal!;
  const elementAtTouch = new Map<number, Element | null>();
  const updateSet = () => setElementsHovered(new Set([...elementAtTouch.values()].filter(v => v) as Element[]));
  const setPositionHandler = catchify((evt: TouchEvent) => {
    for (const touch of evt.changedTouches) {
      elementAtTouch.set(touch.identifier, document.elementFromPoint(touch.clientX, touch.clientY));
    }
    updateSet();
  });
  const deleteTouchHandler = catchify((evt: TouchEvent) => {
    for (const touch of evt.changedTouches) {
      elementAtTouch.delete(touch.identifier);
    }
    updateSet();
  });

  addEventListener("touchstart", setPositionHandler, { passive: true });
  addEventListener("touchend", deleteTouchHandler, { passive: true });
  addEventListener("touchcancel", deleteTouchHandler, { passive: true });

  onCleanup(() => {
    removeEventListener("touchstart", setPositionHandler);
    removeEventListener("touchend", deleteTouchHandler);
    removeEventListener("touchcancel", deleteTouchHandler);
  });
}
