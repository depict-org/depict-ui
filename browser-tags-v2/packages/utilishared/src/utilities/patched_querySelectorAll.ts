const needs_patching = typeof window === "object" ? /*@__PURE__*/ check_if_querySelectorAll_needs_patching() : false;

/**
 * Element.querySelectorAll is broken in Chrome 37-latest, use this instead.
 * Related bug: https://bugs.chromium.org/p/chromium/issues/detail?id=1286047
 * @param  element                Quite broadly anything you'd normaly call querySelectorAll on, including "null"
 * @param  selector               The selector to search for
 * @return          Stock return value
 */
export function patched_querySelectorAll<T extends Element>(
  element: Element | Document | DocumentFragment | null,
  selector: string
): NodeListOf<T> | T[] | undefined {
  if (!(element instanceof Element) || !needs_patching || !selector.includes("#") || !selector.includes("+")) {
    // covers most cases, we don't need patching or don't hit the bug
    return element?.querySelectorAll?.(selector);
  }
  const result: T[] = [];
  const elements_to_check: T[] = [];

  // intentionally not recursive since it's possible to have deeper nested elements than max stack size
  for (let i = element.children.length; i--; ) {
    elements_to_check.push(element.children[i] as T);
  }

  while (elements_to_check.length) {
    const child_element = elements_to_check.pop()!;
    if (child_element.matches(selector)) {
      result.push(child_element);
    }
    for (let i = child_element.children.length; i--; ) {
      // kudos to Karl for algorithm help
      elements_to_check.push(child_element.children[i] as T);
    }
  }
  return result;
}

function check_if_querySelectorAll_needs_patching() {
  const id_div = document.createElement("div");
  const element = document.createElement("section");
  const selector = "#a+*";
  id_div.id = "a";
  document.documentElement.append(id_div, element);

  try {
    return element === element.querySelectorAll(selector)[0];
  } finally {
    id_div.remove();
    element.remove();
  }
}
