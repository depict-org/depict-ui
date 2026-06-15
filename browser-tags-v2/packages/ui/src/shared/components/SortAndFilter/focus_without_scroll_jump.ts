import { catchify } from "@depict-ai/utilishared";

type RestoreScrollPosition = VoidFunction;

const scrollable_overflow_values = new Set(["auto", "scroll", "overlay"]);

function is_scrollable(el: HTMLElement) {
  const { overflowX, overflowY } = getComputedStyle(el);
  const can_scroll_y = scrollable_overflow_values.has(overflowY) && el.scrollHeight > el.clientHeight;
  const can_scroll_x = scrollable_overflow_values.has(overflowX) && el.scrollWidth > el.clientWidth;
  return can_scroll_y || can_scroll_x;
}

function collect_scroll_restorers(el: HTMLElement) {
  const restorers: RestoreScrollPosition[] = [];
  const { scrollX, scrollY } = globalThis;
  const document_scroller = document.scrollingElement;

  restorers.push(() => {
    if (globalThis.scrollX !== scrollX || globalThis.scrollY !== scrollY) globalThis.scrollTo(scrollX, scrollY);
  });

  if (document_scroller instanceof HTMLElement) {
    const { scrollLeft, scrollTop } = document_scroller;
    restorers.push(() => {
      if (document_scroller.scrollLeft !== scrollLeft) document_scroller.scrollLeft = scrollLeft;
      if (document_scroller.scrollTop !== scrollTop) document_scroller.scrollTop = scrollTop;
    });
  }

  for (let ancestor = el.parentElement; ancestor; ancestor = ancestor.parentElement) {
    if (!is_scrollable(ancestor)) continue;
    const scrollable_ancestor = ancestor;
    const { scrollLeft, scrollTop } = ancestor;
    restorers.push(() => {
      if (scrollable_ancestor.scrollLeft !== scrollLeft) scrollable_ancestor.scrollLeft = scrollLeft;
      if (scrollable_ancestor.scrollTop !== scrollTop) scrollable_ancestor.scrollTop = scrollTop;
    });
  }

  return restorers;
}

export function focus_without_scroll_jump(el: HTMLElement) {
  const restorers = collect_scroll_restorers(el);
  const restore_scroll_positions = catchify(() => restorers.forEach(restore => restore()));

  el.focus({ preventScroll: true });
  restore_scroll_positions();

  // Some browsers apply focus scroll after focus() returns. Listen briefly so we catch that deferred scroll too.
  addEventListener("scroll", restore_scroll_positions, { capture: true, passive: true });
  setTimeout(
    catchify(() => removeEventListener("scroll", restore_scroll_positions, { capture: true })),
    250
  );
}
