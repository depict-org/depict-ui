import { catchify } from "../logging/error";

export const use_element = <E extends HTMLOrSVGElement = HTMLElement>(callback: (element: E) => void, element: E) => (
  catchify(callback)(element), element
);

// TODO: Fix this function overloading to not break the other overloading
// export function use_listener<K extends string, E extends HTMLElement = HTMLElement>(
//   event: K,
//   handler: (this: GlobalEventHandlers, ev: Event) => any,
//   element: E
// ): E;
export function use_listener<K extends keyof GlobalEventHandlersEventMap, E extends HTMLElement = HTMLElement>(
  event: K,
  handler: (this: GlobalEventHandlers, ev: GlobalEventHandlersEventMap[K]) => any,
  element: E
): E;
export function use_listener(event, handler, element) {
  element.addEventListener(event, catchify(handler));
  return element;
}

export const classlist = /* @PURE */ (classes: (string | undefined)[]) =>
  classes.filter(c => c !== undefined).join(" ");
