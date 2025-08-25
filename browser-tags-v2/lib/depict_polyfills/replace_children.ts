import { Elem } from "@depict-ai/utilishared/latest";

export function polyfill_replace_children() {
  Document.prototype.replaceChildren ||= replaceChildren;
  DocumentFragment.prototype.replaceChildren ||= replaceChildren;
  Element.prototype.replaceChildren ||= replaceChildren;
}

function replaceChildren(this: Document | DocumentFragment | Element, ...new_children: Elem[]) {
  const { childNodes } = this;
  while (childNodes.length) {
    childNodes[0].remove();
  }
  this.append(...new_children);
}
