import { observer } from "@depict-ai/utilishared";

type DisconnectFunction = () => void;

interface OnExistsObserverReturn {
  /**
   * Disconnects the observer
   *
   * @returns void
   *
   * @example
   *  ```typescript
   * const { disconnect } = onExistsObserver(".my-class", (element) => {
   *    console.log("Element exists", element);
   * });
   * ...
   * // Disconnect the observer when you're done with it
   * disconnect();
   * ```
   */
  disconnect: DisconnectFunction;
}

/**
 * Observes an element and calls a callback when the element exists
 * @param selector - The selector to observe
 * @param callback - The callback to call when the element exists
 * @returns An object with a disconnect function
 * @example Simple usage
 * ```typescript
 * onExistsObserver(".my-class", (element) => {
 *    console.log("Element exists", element);
 * }
 * ```
 * @example Disconnect the observer from the callback itself
 * ```typescript
 * onExistsObserver(".my-class", (element, disconnect) => {
 *    console.log("Element exists", element);
 *    disconnect();
 * }
 * ```
 * @example Disconnect the observer from outside the callback
 *  ```typescript
 * const { disconnect } = onExistsObserver(".my-class", (element) => {
 *    console.log("Element exists", element);
 * });
 * ...
 * // Disconnect the observer when you're done with it
 * disconnect();
 * ```
 */
export function onExistsObserver<T extends HTMLElement>(
  selector: string,
  callback: (element: T, disconnect: DisconnectFunction) => void
): OnExistsObserverReturn {
  const onExistsObserver = observer.onexists(selector, ({ element, disconnector }) => {
    callback(element as T, disconnector);
  });

  return { disconnect: onExistsObserver };
}
