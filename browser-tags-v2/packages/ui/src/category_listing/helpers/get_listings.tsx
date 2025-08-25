import { base_url, dlog, fetch_retry, report } from "@depict-ai/utilishared";
import { ListListingsResponseItem } from "@depict-ai/types/api/ListListingsResponseItem";
import { ListListingsRequest } from "@depict-ai/types/api/ListListingsRequest";

const TEN_MINUTES = 1000 * 60 * 10;
const TWENTY_FOUR_HOURS = 1000 * 60 * 60 * 24;

/**
 * Gets available listings for a given merchant, market and locale
 */
export async function get_listings(merchant: string, market: string, locale: string) {
  let localstorage_value: undefined | { updated?: number; queries?: ListListingsResponseItem[] };
  const localstorage_key = `depict_listings_${JSON.stringify([merchant, market, locale])}}`;
  try {
    const in_ls = localStorage[localstorage_key];
    if (in_ls) {
      localstorage_value = JSON.parse(in_ls);
    }
  } catch (e) {
    dlog("Failed parsing JSON from localStorage", e);
  }
  const updated = localstorage_value?.updated;
  const now = +new Date();
  const stored_queries = localstorage_value?.queries;
  if (Array.isArray(stored_queries) && typeof updated === "number") {
    const age = now - updated;
    if (stored_queries.length && age < TEN_MINUTES) {
      // if younger than 10 minutes and probably valid data, just return stored value
      return stored_queries;
    } else if (age < TWENTY_FOUR_HOURS) {
      // if younger than a day, return stored value but still trigger re-fetch, so we have fresh data next page load (stale data this one but never a delay)
      fetch_and_store_categories(merchant, market, locale, localstorage_key).catch(e =>
        report([e, "couldn't fetch categories"], "warning")
      );
      return stored_queries;
    }
    // else: we are older and just fetch, store and return new queries
  }
  return await fetch_and_store_categories(merchant, market, locale, localstorage_key);
}

async function fetch_and_store_categories(merchant: string, market: string, locale: string, localstorage_key: string) {
  const new_categories = await download_categories(merchant, market, locale);
  try {
    localStorage[localstorage_key] = JSON.stringify({
      updated: +new Date(),
      queries: new_categories,
    });
  } catch (e) {
    report([e as Error, "couldn't store queries in localStorage"], "warning"); // in case of full localStorage, still function
  }
  return new_categories;
}

async function download_categories(merchant: string, market: string, locale: string) {
  const url = new URL(base_url + "/v3/listings");
  const request: ListListingsRequest = { merchant, market, locale };
  url.search = "" + new URLSearchParams(request as unknown as Record<string, string>);
  const fetched = await fetch_retry(url.href);
  if (!fetched) {
    return [];
  }
  try {
    if (fetched.status !== 200) {
      dlog("failed to fetch queries, server responded with", fetched.status, fetched, await fetched.text());
      return [];
    }
    return (await fetched.json()) as ListListingsResponseItem[];
  } catch (e) {
    dlog("failed to decode queries json", fetched, e);
    return [];
  }
}
