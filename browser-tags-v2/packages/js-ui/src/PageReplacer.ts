import { PageReplacer as OrigPageReplacer } from "@depict-ai/ui";

type renderMode = "append" | "replace";

interface PageReplacerConfig {
  isPageToReplace: (url: URL) => boolean;
  selectorToReplace: string;
  renderContent: () => HTMLElement | HTMLElement[];
  renderMode?: renderMode;
  documentTitle?: string;
}

/**
 * SetupPageReplacer is a function that can be used to layer SPA (single page application) functionality on top of a standard server side rendered webpage, for certain pages.
 * An example use case is to instantly (without a server page request) navigate to the Depict search result page, or between one query to the next.
 * PageReplacer works by listening to URL changes (performed via `history.pushState`), testing if they match the `isPageToReplace` criteria, then replacing a specified element with another element.
 * The element that is replaced is specified by a CSS selector and usually represents the "main content" container of the page. The "replacement" works by setting `display: none` on the original content and adding the new content immediately after it in the DOM.
 * @param renderContent A function that returns the element(s) which replace the "page" when `isPageToReplace` returns `true`.
 * @param documentTitle The title that `document.title` should be changed to when page replacement is active (when `isPageToReplace` returns `true`).
 * @param isPageToReplace A function that returns `true` if the provided URL is a page where the replacement should be active.
 * @param selectorToReplace A CSS selector that selects the element to replace.
 * @param renderMode If set to `"append"`, the new element will be appended to the element that is found by `selectorToReplace` instead of replacing it. This is useful in certain edge cases.
 * @returns A function that can be called to destroy the page replacer. This will reset the content to the original content if the replacer is currently open.
 */
export function SetupPageReplacer({
  isPageToReplace,
  selectorToReplace,
  renderContent,
  renderMode = "replace",
  documentTitle,
}: PageReplacerConfig) {
  let replacer: OrigPageReplacer | null = new OrigPageReplacer({
    is_page_: isPageToReplace,
    selector_: selectorToReplace,
    // Todo: Most optimized way to do this
    render_: () => {
      const content = renderContent();
      return Array.isArray(content) ? content : [content];
    },
    append_instead_of_replace_: renderMode === "append",
    title_: documentTitle,
  });

  return () => {
    replacer?.destroy_();
    replacer = null;
  };
}
