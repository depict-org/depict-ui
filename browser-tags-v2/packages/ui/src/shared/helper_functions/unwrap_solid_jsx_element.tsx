import { createMemo, JSX } from "solid-js";

/**
 * Unwraps a solid JSX element into an array of nodes, strings and numbers
 * Using this instead of solid-js' children helper because the typing of the returned array is more useful (can more easily be passed to DOM manipulation functions) and you don't have to pass a function
 * Also it doesn't have the extra step for toArray (we always want an array)
 * Feel free to switch though, not hugely convinced this is better (but it's already here from before I knew about children, so only using one for bundle size reasons)
 * @param elements
 */
export function unwrap_solid_jsx_element(elements: JSX.Element | (() => JSX.Element)) {
  // FYI this probably doesn't work on hugely deep nestings or large amount of elements
  return createMemo(() => unwrapping_helper(elements));
}

function unwrapping_helper(elements: JSX.Element | (() => JSX.Element)) {
  const result: (Node | string | number)[] = [];
  if (Array.isArray(elements)) {
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      result.push(...unwrapping_helper(element));
    }
  } else if (typeof elements == "function") {
    result.push(...unwrapping_helper((elements as () => JSX.Element)()));
  } else if (elements != undefined && typeof elements != "boolean") {
    result.push(elements);
  }
  return result;
}
