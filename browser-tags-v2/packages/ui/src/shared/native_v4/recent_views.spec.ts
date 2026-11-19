import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MAX_RECENT_VIEW_AGE_MS, MAX_RECENT_VIEWS, read_recent_views, record_recent_view } from "./recent_views";

const NOW = Date.parse("2026-11-19T12:00:00.000Z");
const minutes = (n: number) => n * 60 * 1000;
const key = (merchant: string) => `depict_v4_recent_views_${merchant}`;
let unique = 0;
/** The store keeps per-merchant state for the page, so every test uses its own merchant. */
const merchant = () => `shop${++unique}`;

beforeEach(() => localStorage.clear());
afterEach(() => {
  jest.restoreAllMocks();
});

describe("recent views", () => {
  it("is empty for a new shopper", () => {
    expect(read_recent_views(merchant(), NOW)).toEqual([]);
  });

  it("lists views newest first, one per product, and persists them in localStorage", () => {
    const shop = merchant();
    record_recent_view(shop, "a", NOW);
    record_recent_view(shop, "b", NOW + minutes(1));
    record_recent_view(shop, "a", NOW + minutes(2));

    const expected = [
      { id: "a", at: "2026-11-19T12:02:00.000Z" },
      { id: "b", at: "2026-11-19T12:01:00.000Z" },
    ];
    expect(read_recent_views(shop, NOW + minutes(3))).toEqual(expected);
    expect(JSON.parse(localStorage.getItem(key(shop))!)).toEqual(expected);
  });

  it("stores only product ids and view times", () => {
    const shop = merchant();
    record_recent_view(shop, "a", NOW);
    const stored = JSON.parse(localStorage.getItem(key(shop))!) as object[];
    expect(stored.map(view => Object.keys(view).sort())).toEqual([["at", "id"]]);
  });

  it("keeps each merchant's history apart", () => {
    const [one, two] = [merchant(), merchant()];
    record_recent_view(one, "a", NOW);
    expect(read_recent_views(two, NOW)).toEqual([]);
  });

  it(`keeps the newest ${MAX_RECENT_VIEWS}`, () => {
    const shop = merchant();
    for (let i = 0; i < MAX_RECENT_VIEWS + 5; i++) record_recent_view(shop, `p${i}`, NOW + i);
    const views = read_recent_views(shop, NOW + 100);
    expect(views).toHaveLength(MAX_RECENT_VIEWS);
    expect(views[0].id).toBe(`p${MAX_RECENT_VIEWS + 4}`);
    expect(views.at(-1)!.id).toBe("p5");
  });

  it("drops views older than the age bound", () => {
    const shop = merchant();
    record_recent_view(shop, "old", NOW);
    record_recent_view(shop, "new", NOW + MAX_RECENT_VIEW_AGE_MS);
    expect(read_recent_views(shop, NOW + MAX_RECENT_VIEW_AGE_MS + 1).map(view => view.id)).toEqual(["new"]);
  });

  it("ignores what it can't read: bad JSON, a non-list, malformed entries", () => {
    const shop = merchant();
    localStorage.setItem(key(shop), "{not json");
    expect(read_recent_views(shop, NOW)).toEqual([]);
    localStorage.setItem(key(shop), JSON.stringify({ id: "a" }));
    expect(read_recent_views(shop, NOW)).toEqual([]);
    localStorage.setItem(
      key(shop),
      JSON.stringify([
        null,
        { id: "", at: "2026-11-19T11:00:00Z" },
        { id: 7, at: "2026-11-19T11:00:00Z" },
        { id: "x".repeat(501), at: "2026-11-19T11:00:00Z" },
        { id: "a", at: "yesterday" },
        { id: "b", at: "2026-11-19T11:00:00+01:00" },
      ])
    );
    expect(read_recent_views(shop, NOW)).toEqual([{ id: "b", at: "2026-11-19T10:00:00.000Z" }]);
    // A bad stored list doesn't stop new views from being recorded.
    localStorage.setItem(key(shop), "{not json");
    record_recent_view(shop, "c", NOW);
    expect(read_recent_views(shop, NOW).map(view => view.id)).toEqual(["c"]);
  });

  it("keeps the history in memory when localStorage throws", () => {
    const shop = merchant();
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    record_recent_view(shop, "a", NOW);
    record_recent_view(shop, "b", NOW + 1);
    expect(read_recent_views(shop, NOW + 2).map(view => view.id)).toEqual(["b", "a"]);
  });

  it("reads the newer list from memory when localStorage is full, not the stale stored one", () => {
    const shop = merchant();
    record_recent_view(shop, "a", NOW);
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    record_recent_view(shop, "b", NOW + 1);
    expect(read_recent_views(shop, NOW + 2).map(view => view.id)).toEqual(["b", "a"]);
  });
});
