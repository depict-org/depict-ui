import { dlog } from "@depict-ai/utilishared";

function recurse_children<T extends Element>(element: T, dowith: (el: Element) => void) {
  // I think something in here is wrong but it did the trick for me the one time I needed it, just take it as a reference
  const elements_to_check: T[] = [element];

  for (let i = element.children.length; i--; ) {
    elements_to_check.push(element.children[i] as T);
  }

  while (elements_to_check.length) {
    const child_element = elements_to_check.pop()!;
    dowith(child_element);
    for (let i = child_element.children.length; i--; ) {
      elements_to_check.push(child_element.children[i] as T);
    }
  }
}

function dump_namespaces(el: SVGElement) {
  const op: string[] = [];
  recurse_children(el, child => {
    if (child.namespaceURI != "http://www.w3.org/2000/svg") {
      op.push(child.tagName.toLowerCase());
    }
    dlog(
      child.namespaceURI,
      child,
      Object.fromEntries([...child.attributes].map(attribute => [attribute.name, attribute.namespaceURI])),
      Object.fromEntries(
        [...child.attributes].map(attribute => [attribute.name, attribute.namespaceURI]).filter(([a, b]) => b)
      )
    );
  });
  return op;
}

declare global {
  interface Window {
    dump_namespaces: typeof dump_namespaces;
  }
}
window.dump_namespaces = dump_namespaces;
