import { catchify } from "@depict-ai/utilishared";

export function open_search_with_shift_slash(open_search: VoidFunction) {
  const handler = catchify((e: KeyboardEvent) => {
    const { key, target } = e;
    const { body } = document;
    if (
      key === "/" &&
      (target === body || !body.contains(target as Element)) /* the body or an element above was focused */
    ) {
      open_search();
      e.preventDefault();
    }
  });
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
