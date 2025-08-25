import { dlog } from "../../../logging/dlog";

/**
 * Attempt to navigate using nextjs's spa router.
 * Falls back to default browser navigation.
 * Docs: https://nextjs.org/docs/api-reference/next/router
 */
export function navigate_with_next_router(e: MouseEvent, url: string) {
  if (e.button) {
    dlog("Not single page navigating because button is not 0", e);
    return;
  }
  if (e.metaKey || e.ctrlKey) {
    dlog("Someone command-clicked a link, not single page navigating");
    return;
  }
  // single page navigate
  const router = (window as any)?.next?.router;
  if (typeof router?.push == "function") {
    const parsed = new URL(url);
    const path_and_query_params = parsed.pathname + parsed.search;
    router.push(path_and_query_params, path_and_query_params, { shallow: false, scroll: true });
    e.preventDefault();
    return false;
  }
}
