import type { ContextResponse, RecommendationInput } from "./v4_types";
import { native_get_json, native_merchant_url } from "./http";

/** Each recommendation type the merchant's V4 serves, and the inputs it reads (`/context` `recommendation_types`). */
export type RecommendationTypes = ReadonlyMap<string, readonly RecommendationInput[]>;

/**
 * How long a merchant's recommendation types are reused from localStorage. `/context` is `no-store` and is read
 * before every page's first native recommendations, so this saves that round trip on later pages; a surface the
 * merchant adds or changes reaches shoppers within this time.
 */
export const CONTEXT_TTL_MS = 15 * 60 * 1000;

const storage_key = (merchant: string) => `depict_v4_recommendation_types_${merchant}`;

/** One read per merchant and CONTEXT_TTL_MS in this page; a failed read is forgotten so the next caller tries again. */
const in_flight = new Map<string, { started_at: number; read: Promise<RecommendationTypes | undefined> }>();

type Stored = { fetched_at: number; types: { type: string; inputs: RecommendationInput[] }[] };

function from_storage(merchant: string, now: number): RecommendationTypes | undefined {
  try {
    const stored = JSON.parse(localStorage.getItem(storage_key(merchant)) ?? "null") as Stored | null;
    if (!stored || !Array.isArray(stored.types) || !(now - stored.fetched_at < CONTEXT_TTL_MS)) return undefined;
    return to_map(stored.types);
  } catch {
    return undefined;
  }
}

function to_storage(merchant: string, types: Stored["types"], now: number) {
  try {
    localStorage.setItem(storage_key(merchant), JSON.stringify({ fetched_at: now, types } satisfies Stored));
  } catch {
    // localStorage unavailable or full: read /context again on the next page.
  }
}

const to_map = (types: Stored["types"]): RecommendationTypes =>
  new Map(types.map(({ type, inputs }) => [type, inputs]));

/**
 * The recommendation types the merchant's V4 serves, from `/v4/{merchant}/context`, or undefined when it can't be read.
 * A merchant V4 serves no recommendations for has none (an empty map).
 */
export function get_recommendation_types(merchant: string, now = Date.now()): Promise<RecommendationTypes | undefined> {
  const pending = in_flight.get(merchant);
  if (pending && now - pending.started_at < CONTEXT_TTL_MS) return pending.read;
  const stored = from_storage(merchant, now);
  if (stored) return Promise.resolve(stored);
  const read = native_get_json<ContextResponse>(native_merchant_url(merchant, "/context")).then(context => {
    if (!context) {
      if (in_flight.get(merchant)?.read === read) in_flight.delete(merchant);
      return undefined;
    }
    const types = context.recommendation_types ?? [];
    to_storage(merchant, types, now);
    return to_map(types);
  });
  in_flight.set(merchant, { started_at: now, read });
  return read;
}

/** Forgets the reads made in this page (tests; localStorage is cleared separately). */
export function forget_recommendation_types() {
  in_flight.clear();
}
