/**
 * `HTMLElement.focus()` is a **silent no-op** on an element that is not being rendered
 * (`display: none`, `visibility: hidden`, a collapsed menu). Nothing throws, focus simply
 * stays where it was, so a caller that does not check believes it restored focus when it
 * left it on `<body>` — which puts the keyboard user back at the top of the document.
 *
 * That is reachable whenever the element which opened a modal stops being rendered while the
 * modal is open, and the common way for that to happen is the responsive-duplicate header:
 * a theme renders the same search trigger twice, once for desktop and once for mobile, and
 * hides one at the current breakpoint. Open the modal from the desktop trigger, cross the
 * breakpoint (rotate a tablet, resize a window), close the modal, and the remembered trigger
 * is still `isConnected` but no longer rendered. Verified against a live merchant storefront
 * on 4.10.19.
 *
 * So: verify that focus landed, and when it did not, look for a rendered twin of the same
 * control — the other half of the responsive pair — and use that instead.
 */

/**
 * An element can only take focus if it is actually being rendered.
 *
 * Injectable because it is the one part of this module that needs a layout engine: jsdom
 * reports no client rects for anything, so the specs pass their own predicate to exercise the
 * matching rules. The real predicate is only exercised in a browser.
 */
export const is_rendered = (element: HTMLElement) => !!element.getClientRects().length;

/**
 * `document.activeElement` is the outermost shadow host when focus is inside a shadow tree,
 * so ask the element's own root rather than the document — matching how the rest of
 * modal_opener treats shadow-mounted modals.
 */
const has_focus = (element: HTMLElement) =>
  (element.getRootNode() as Document | ShadowRoot).activeElement === element;

/**
 * The accessible-name-ish identity we match twins on. Deliberately narrow: an explicit label
 * or the trimmed text. Two controls that share a tag and this string are the same control
 * rendered twice, which is exactly the responsive-duplicate case.
 */
const identity_of = (element: HTMLElement) =>
  (element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent || "")
    .trim()
    .replace(/\s+/g, " ");

/**
 * The rendered counterpart of an element that can no longer take focus, if there is exactly
 * one. Ambiguity is treated as "no twin": guessing between several candidates would move
 * focus somewhere arbitrary, which is worse than the caller's existing fallback.
 */
export function find_rendered_twin(
  element: HTMLElement,
  rendered: (element: HTMLElement) => boolean = is_rendered
): HTMLElement | undefined {
  const identity = identity_of(element);
  if (!identity) return; // nothing to match on — an icon-only button with no label
  const twins = [...element.ownerDocument.querySelectorAll<HTMLElement>(element.localName)].filter(
    candidate => candidate !== element && rendered(candidate) && identity_of(candidate) === identity
  );
  return twins.length === 1 ? twins[0] : undefined;
}

/**
 * Focus `element`, falling back to its rendered twin when `element` cannot take focus.
 *
 * `preventScroll` throughout, because the caller uses it to avoid re-introducing a Safari
 * page-jump.
 *
 * @returns whether focus actually landed somewhere
 */
export function restore_focus_to(
  element: HTMLElement,
  rendered: (element: HTMLElement) => boolean = is_rendered
): boolean {
  element.focus({ preventScroll: true });
  if (has_focus(element)) return true;

  const twin = find_rendered_twin(element, rendered);
  if (!twin) return false;
  twin.focus({ preventScroll: true });
  return has_focus(twin);
}
