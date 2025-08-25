import { isServer } from "solid-js/web";

// Value first font lazy loading so page gets hydrated before the fonts load, reducing time to interactivity
// Copy-pasted from shopify frontend
export async function lazyLoadFonts() {
  if (isServer) return;

  const { default: fonts } = await import("./fonts.scss?inline");
  const add_fonts = () => setTimeout(() => document.head.append((<style>{fonts}</style>) as HTMLStyleElement));
  const careful_load = () => {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(add_fonts);
    } else {
      add_fonts();
    }
  };
  const page_hasnt_loaded = // @ts-ignore
    window?.performance?.getEntriesByType?.("navigation")?.every?.(e => e?.loadEventEnd) === false;
  // Source: comment on https://stackoverflow.com/a/53525488
  // don't use readyState, source: personal experience and comment on https://stackoverflow.com/a/28093606
  if (page_hasnt_loaded) {
    window.addEventListener("load", careful_load);
  } else {
    careful_load();
  }
}
