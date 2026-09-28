import { find_rendered_twin, is_rendered, restore_focus_to } from "./restore_focus_to";

// jsdom does no layout, so it cannot reproduce the real trigger for this fix — `focus()` on a
// `display: none` button succeeds there and fails in a browser. What jsdom *can* reproduce is
// the mechanism: an element that will not take focus, and whether we notice and fall back.
// A `<div>` without `tabindex` is not a focusable area in jsdom either, so it stands in for the
// unrendered trigger, and the specs inject their own "is it rendered" predicate because jsdom
// reports no client rects for anything. The display:none case itself was verified in Chrome
// against a live storefront; see the file header.
describe("restore_focus_to", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  // jsdom has no layout, so stand in for the browser's client-rect probe.
  const all_rendered = () => true;

  const labelled = (tag: string, label: string) => {
    const el = document.createElement(tag);
    el.setAttribute("aria-label", label);
    document.body.append(el);
    return el as HTMLElement;
  };

  it("focuses the element when it can take focus", () => {
    const button = labelled("button", "Search");

    expect(restore_focus_to(button)).toBe(true);
    expect(document.activeElement).toBe(button);
  });

  it("falls back to the rendered twin when the element cannot take focus", () => {
    // The responsive-duplicate header: the same control rendered twice, the remembered one
    // unable to take focus.
    const unfocusable = labelled("div", "Search");
    const twin = labelled("div", "Search");
    twin.tabIndex = 0;

    expect(restore_focus_to(unfocusable, all_rendered)).toBe(true);
    expect(document.activeElement).toBe(twin);
  });

  it("does not match a twin of a different tag", () => {
    const unfocusable = labelled("div", "Search");
    const different_tag = labelled("button", "Search");

    expect(restore_focus_to(unfocusable, all_rendered)).toBe(false);
    expect(document.activeElement).not.toBe(different_tag);
  });

  it("does not match a twin with a different label", () => {
    const unfocusable = labelled("div", "Search");
    const other = labelled("div", "Menu");
    other.tabIndex = 0;

    expect(restore_focus_to(unfocusable, all_rendered)).toBe(false);
    expect(document.activeElement).not.toBe(other);
  });

  it("refuses to guess between several candidate twins", () => {
    // Two equally good candidates means we cannot know which half of the pair is the one the
    // shopper sees. Moving focus somewhere arbitrary is worse than leaving the caller's
    // existing fallback to run.
    const unfocusable = labelled("div", "Search");
    const first = labelled("div", "Search");
    first.tabIndex = 0;
    const second = labelled("div", "Search");
    second.tabIndex = 0;

    expect(restore_focus_to(unfocusable, all_rendered)).toBe(false);
    expect(document.activeElement).not.toBe(first);
    expect(document.activeElement).not.toBe(second);
  });

  it("matches on trimmed text content when there is no label", () => {
    const unfocusable = document.createElement("div");
    unfocusable.textContent = "  Search\n ";
    document.body.append(unfocusable);
    const twin = document.createElement("div");
    twin.textContent = "Search";
    twin.tabIndex = 0;
    document.body.append(twin);

    expect(restore_focus_to(unfocusable, all_rendered)).toBe(true);
    expect(document.activeElement).toBe(twin);
  });

  it("does not match an unlabelled, textless element to anything", () => {
    // An icon-only trigger with no accessible name gives us nothing to match on; matching on
    // "" would pair it with every other empty element on the page.
    const unfocusable = labelled("div", "");
    const empty_twin = labelled("div", "");
    empty_twin.tabIndex = 0;

    expect(restore_focus_to(unfocusable, all_rendered)).toBe(false);
    expect(document.activeElement).not.toBe(empty_twin);
  });

  it("reports failure when nothing can take focus", () => {
    const unfocusable = labelled("div", "Search");

    expect(restore_focus_to(unfocusable, all_rendered)).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });

  it("only considers the rendered one of several identical controls", () => {
    // The real case, and the reason "refuses to guess" does not over-trigger on it: a theme can
    // render the same trigger three times across breakpoints, and exactly one is on screen.
    const origin = labelled("div", "Search");
    const hidden_twin = labelled("div", "Search");
    hidden_twin.tabIndex = 0;
    const visible_twin = labelled("div", "Search");
    visible_twin.tabIndex = 0;

    expect(find_rendered_twin(origin, element => element === visible_twin)).toBe(visible_twin);
  });

  it("defaults to the client-rect probe, which jsdom cannot satisfy", () => {
    // Documents the seam rather than working around it. The default predicate needs a layout
    // engine, so in jsdom no twin is ever eligible — which is why every spec above injects one.
    // If this ever starts finding a twin here, the probe changed and the browser behaviour has
    // to be re-verified.
    const origin = labelled("div", "Search");
    const twin = labelled("div", "Search");
    twin.tabIndex = 0;

    expect(is_rendered(twin)).toBe(false);
    expect(find_rendered_twin(origin)).toBeUndefined();
  });
});
