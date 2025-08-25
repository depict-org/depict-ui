import { report } from "../logging/error";
import { ElementObserver } from "./ElementObserver";

export { ElementObserver } from "./ElementObserver";
export type { Disconnector } from "./ElementObserver";
export { ElementObserverEvent } from "./ElementObserverEvent";

/**
 * Epic alien tech that categorizes DOM mutations, allowing one to listen and quickly (+2 ticks in the microtask queue, all before paint) react to DOM mutations such as elements (matching a selector) being added, deleted or changed.
 */
export const observer = /*@__PURE__*/ make_default_observer()!;
function make_default_observer() {
  try {
    return new ElementObserver();
  } catch (error) {
    report([error, "error starting ElementObserver"], "error");
  }
}
