import { createSignal, onCleanup } from "solid-js";

/**
 * Returns if the current tab is visible
 */
export function useVisibilityState() {
  const d = document;
  const [isVisible, setIsVisible] = createSignal(d.visibilityState !== "hidden");
  const handleVisibilityChange = () => setIsVisible(d.visibilityState !== "hidden");
  d.addEventListener("visibilitychange", handleVisibilityChange);
  onCleanup(() => d.removeEventListener("visibilitychange", handleVisibilityChange));

  return isVisible;
}
