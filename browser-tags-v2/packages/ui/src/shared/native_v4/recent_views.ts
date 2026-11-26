import type { RecentView } from "./v4_types";

/**
 * The shopper's recently viewed products, kept in the browser for the native V4 API's history-based recommendations.
 *
 * v3 kept this history on the server, per session. V4 content requests carry no session, so a surface that reads
 * history gets it in the request (`recent_views`), and the SDK keeps the list. It holds product ids and view times
 * only (no session, user or page data), bounded in size and age, in localStorage per merchant; when localStorage
 * can't be used (private mode, blocked, full) it lives in memory for the page load.
 *
 * A view is recorded when a native product-anchored recommendation request resolves its anchor, as v3's facade records
 * a resolved anchor as a view; the product being viewed is in the list from the next request on.
 */

/** recs-wasm reads the newest 20 views (V4 `recent_views` docs), so more would never be read. */
export const MAX_RECENT_VIEWS = 20;
/** Views older than this are dropped. */
export const MAX_RECENT_VIEW_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** V4's longest product id (`ProductRef`); a longer one is never a product it knows. */
const MAX_ID_LENGTH = 500;

const storage_key = (merchant: string) => `depict_v4_recent_views_${merchant}`;

/** The list per merchant as last written, which reads use when localStorage can't hold it. */
const in_memory = new Map<string, RecentView[]>();
/** Merchants whose last write to localStorage failed, so localStorage holds an older list than memory. */
const unstored = new Set<string>();

/** `views` as a valid list: well-formed entries, newest first, one per id, not older than the age bound or too many. */
function bounded(views: unknown, now: number): RecentView[] {
  if (!Array.isArray(views)) return [];
  const seen = new Set<string>();
  const kept: { view: RecentView; time: number }[] = [];
  for (const item of views) {
    if (!item || typeof item !== "object") continue;
    const { id, at } = item as Partial<RecentView>;
    if (typeof id !== "string" || !id || id.length > MAX_ID_LENGTH || typeof at !== "string") continue;
    const time = Date.parse(at);
    if (Number.isNaN(time) || now - time > MAX_RECENT_VIEW_AGE_MS) continue;
    kept.push({ view: { id, at: new Date(time).toISOString() }, time });
  }
  kept.sort((a, b) => b.time - a.time);
  const newest: RecentView[] = [];
  for (const { view } of kept) {
    if (seen.has(view.id)) continue;
    seen.add(view.id);
    newest.push(view);
    if (newest.length === MAX_RECENT_VIEWS) break;
  }
  return newest;
}

function read_stored(merchant: string): unknown {
  if (unstored.has(merchant)) return in_memory.get(merchant);
  try {
    const stored = localStorage.getItem(storage_key(merchant));
    return stored === null ? [] : JSON.parse(stored);
  } catch {
    return in_memory.get(merchant) ?? [];
  }
}

/** The merchant's recent views, newest first: what a native recommendation request sends as `recent_views`. */
export function read_recent_views(merchant: string, now = Date.now()): RecentView[] {
  return bounded(read_stored(merchant), now);
}

/** Records that the shopper viewed `product_id` now. Its earlier view, if any, is replaced. */
export function record_recent_view(merchant: string, product_id: string, now = Date.now()) {
  const views = bounded(
    [{ id: product_id, at: new Date(now).toISOString() }, ...read_recent_views(merchant, now)],
    now
  );
  in_memory.set(merchant, views);
  try {
    localStorage.setItem(storage_key(merchant), JSON.stringify(views));
    unstored.delete(merchant);
  } catch {
    // localStorage unavailable or full: the in-memory list serves this page load.
    unstored.add(merchant);
  }
}
