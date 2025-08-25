/**
 * This does what you'd think Element.closest does. It finds the closest node in the DOM tree matching a selector. So it starts out with the siblings and then goes upwards in the DOM and checks the siblings and their children of the parent until there's no parent anymore.
 * @param  element                        Element to start out at
 * @param  selector                       Selector to search for
 * @param  start_right=true               In what direction to start: true = right, false = left
 * @return                                The found element or undefined
 */

export function chaotic_closest(element: Element, selector: string, start_right = true) {
  for (; element; element = element.parentNode as Element) {
    if (element?.matches?.(selector)) {
      return element;
    }
    const has_matching_child = element?.querySelector?.(selector);
    if (has_matching_child) {
      return has_matching_child;
    }
    const child_nodes = [...(element?.parentNode?.childNodes || [])] as Element[];
    const our_index = child_nodes.indexOf(element);
    for (let i = 0; i < Math.ceil(child_nodes.length / 2); i++) {
      for (let j = 2; j--; ) {
        const direction = start_right ? (j ? 1 : -1) : j ? -1 : 1;
        const node_to_test = child_nodes[our_index + i * direction] as HTMLElement;
        if (node_to_test?.matches?.(selector)) {
          return node_to_test;
        }
        const matching_child = node_to_test?.querySelector?.(selector);
        if (matching_child) {
          return matching_child;
        }
      }
    }
  }
}
