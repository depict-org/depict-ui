import { base_url, Display, dwarn, fetch_retry, ModernDisplay, report } from "@depict-ai/utilishared";
import { DepictAPI, DepictAPIConstructorOptions, DepictAPIRawCall } from "../DepictAPI";
import { ModernDisplayWithPageUrl } from "../display_transformer_types";
import { set_event_api } from "@depict-ai/utilishared";
import * as IdTypes from "../../category_listing/IdTypes";
import type {
  BrowseInclude,
  BrowseRequest,
  BrowseResponse,
  ErrorResponse,
  ListingResponse,
  ListingTreeResponse,
  SuggestResponse,
} from "./v4_types";
import {
  FacetIndex,
  FilterClause,
  is_resolvable_field,
  NativeFilterError,
  rejected_clauses,
  V3RequestFilter,
  v3_filter_to_clause,
  v3_sort_to_native,
} from "./filters";
import {
  AncestorLookup,
  ancestors_from_tree,
  browse_query_string,
  flat_query_string,
  native_browse_to_v3,
  native_listing_to_v3,
  native_suggest_to_v3,
  to_bcp47,
} from "./responses";

/** One try and at most two retries: a 503 burst from V4 shouldn't be multiplied by fetch_retry's default of 10. */
const NATIVE_MAX_TRIES = 3;
/** V4 browse's largest page; a bigger v3 page is V4's pages chained by their cursors, as the facade does. */
const BROWSE_MAX_LIMIT = 100;
/** V4 browse's page size without a limit, and v3's. */
const DEFAULT_LIMIT = 24;
/** A query with no letter or digit browses the catalogue instead of returning an empty grid, as on v3. */
const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** Which API an SDK reads: `v3` (the default) or the native V4 API (`https://api.depict.ai/v4/{merchant}/…`). */
export type DepictAPIVersion = "v3" | "v4";

/**
 * DepictAPI over the native V4 API. Search, listing pages (products and header) and search suggestions read
 * `/v4/{merchant}/browse`, `/listings` and `/suggest`, and every answer is mapped to the v3 shape DepictAPI returns,
 * so the UI and merchant display transformers work unchanged (see cards.ts for the card mapping).
 *
 * Not native yet, and on v3 instead:
 * - recommendations, the search page's related products (`get_recommended`) among them
 * - looks and shop the look (V4 has no endpoint for them)
 *
 * Creating one also sends tracking events to the native `/v4/{merchant}/events` (`set_event_api("v4")`), for the
 * Performance Client and anything else on this page that shares this `@depict-ai/utilishared`. Events V4 can't take
 * as v3 did (a v3 recommendation's click, say) stay on `/create-events`.
 *
 * The native API is strict: it rejects unknown parameters and fields, and content requests carry no session or
 * metadata, so `get_metadata`/`get_session_id` only affect the cache key here.
 */
export class NativeDepictAPI<
  InputDisplay extends Display,
  OutputDisplay extends ModernDisplay | never = InputDisplay extends ModernDisplay
    ? ModernDisplayWithPageUrl<InputDisplay>
    : never,
> extends DepictAPI<InputDisplay, OutputDisplay> {
  /** Facets served so far, per merchant, market and locale, to resolve v3 filter fields (group titles) to V4 fields. */
  #facet_indices = new Map<string, FacetIndex>();
  /** Browses whose facets were read only to resolve filter fields, so each is read at most once. */
  #learned = new Set<string>();
  /** How many products came before each cursor V4 handed out, for the lower-bound count when `total` is absent. */
  #cursor_offsets = new Map<string, number>();
  /** Each listing's ancestors from the listing tree, per merchant, market and locale, read once a page load. */
  #ancestor_lookups = new Map<string, Promise<AncestorLookup | undefined>>();
  /** Filter clauses V4 refused (`unknown_filter_field`, `invalid_filter`), per merchant, market and locale. */
  #rejected = new Map<string, Set<string>>();

  constructor(options: DepictAPIConstructorOptions<InputDisplay, OutputDisplay>) {
    super(options);
    set_event_api("v4");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async request_raw_(call: DepictAPIRawCall): Promise<any> {
    switch (call.kind_) {
      case "search":
        return await this.#browse("search", call.request_ as V3BrowseRequest);
      case "listing_products":
        return await this.#browse(
          "listing",
          call.request_ as V3BrowseRequest,
          {
            [call.id_type_ === IdTypes.EXTERNAL_ID ? "external_id" : "id"]: call.id_to_query_for_,
          } as BrowseRequest["listing"]
        );
      case "listing":
        return await this.#listing(call);
      case "suggest":
        return await this.#suggest(call.request_);
      default:
        // search/related: recommendations stay on v3 in phase 1.
        return await super.request_raw_(call);
    }
  }

  #merchant_url(merchant: string, path: string) {
    return `${base_url}/v4/${encodeURIComponent(merchant)}${path}`;
  }

  async #get_json<T>(url: string): Promise<T | undefined> {
    return (await this.#get_answer<T>(url)).body_;
  }

  /** A GET's body on a 200, else V4's error (when it sent one). */
  async #get_answer<T>(url: string): Promise<{ body_?: T; error_?: ErrorResponse["error"] }> {
    const response = await fetch_retry(url, { method: "GET" }, NATIVE_MAX_TRIES);
    if (!response) {
      dwarn("[NativeDepictAPI] no response from", url);
      return {};
    }
    if (response.status === 200) return { body_: (await response.json()) as T };
    let error: ErrorResponse["error"] | undefined;
    try {
      error = ((await response.json()) as ErrorResponse).error;
    } catch {
      // not V4's error body
    }
    dwarn("[NativeDepictAPI]", response.status, error?.code, error?.message, error?.request_id, url);
    // fetch_retry already reports a 4xx with its body; report what it doesn't, with V4's code and request id.
    if (response.status >= 500) {
      report([new Error(`V4 ${response.status} ${error?.code ?? ""}`), "Native V4 request failed"], "warning", {
        url,
        status: response.status,
        code: error?.code,
        request_id: error?.request_id ?? response.headers.get("x-depict-request-id"),
      });
    }
    return { error_: error };
  }

  #facet_index(merchant: string, market: string, locale: string | undefined) {
    const key = JSON.stringify([merchant, market, locale]);
    let index = this.#facet_indices.get(key);
    if (!index) this.#facet_indices.set(key, (index = new FacetIndex()));
    return index;
  }

  async #browse_page(merchant: string, request: BrowseRequest) {
    return (await this.#browse_answer(merchant, request)).body_;
  }

  async #browse_answer(merchant: string, request: BrowseRequest) {
    return await this.#get_answer<BrowseResponse>(
      this.#merchant_url(merchant, "/browse") + "?" + browse_query_string(request)
    );
  }

  /** The filter clauses V4 refused, per merchant, market and locale, for this page load. */
  #rejected_clauses(merchant: string, market: string, locale: string | undefined) {
    const key = JSON.stringify([merchant, market, locale]);
    let rejected = this.#rejected.get(key);
    if (!rejected) this.#rejected.set(key, (rejected = new Set()));
    return rejected;
  }

  async #browse(door: "search" | "listing", v3_request: V3BrowseRequest, listing?: BrowseRequest["listing"]) {
    const { merchant, market } = v3_request;
    const locale = to_bcp47(v3_request.locale);
    const query =
      door === "search" && v3_request.query && HAS_LETTER_OR_DIGIT.test(v3_request.query)
        ? v3_request.query
        : undefined;
    const base: BrowseRequest = {
      market,
      ...(locale ? { locale } : {}),
      ...(query ? { query } : {}),
      ...(listing ? { listing } : {}),
    };
    const index = this.#facet_index(merchant, market, locale);
    const filters = (v3_request.filters ?? []) as V3RequestFilter[];

    // depict-ui sends a filter's lowercased group title as its field. A page opened from a link with filters in it
    // comes before any facets, so read this browse's facets once to learn which field each title names.
    const learn_key = JSON.stringify([merchant, base]);
    if (
      filters.some(filter => filter.data != null && !is_resolvable_field(filter.field, index)) &&
      !this.#learned.has(learn_key)
    ) {
      this.#learned.add(learn_key);
      index.learn_((await this.#browse_page(merchant, { ...base, include: ["facets"], limit: 1 }))?.facets);
    }

    // A filter V4 can't take must not cost the shopper the page: a link can outlive its filter (one removed from the
    // store, a hand-written value). One the adapter can't write is left out here; one V4 rejects is left out and the
    // page asked again, and remembered for this page load so later pages don't ask with it.
    const rejected = this.#rejected_clauses(merchant, market, locale);
    let clauses: FilterClause[] = [];
    for (const filter of filters) {
      try {
        const clause = v3_filter_to_clause(filter, index);
        if (clause) clauses.push(clause);
      } catch (e) {
        if (!(e instanceof NativeFilterError)) throw e;
        dwarn("[NativeDepictAPI] leaving out a filter V4 can't take:", e.message, filter);
      }
    }
    clauses = clauses.filter(clause => !rejected.has(clause.clause_));
    const sort = v3_sort_to_native(v3_request.sort);
    const include: BrowseInclude[] =
      door === "search" ? ["facets", "sorts", "content", "attributes"] : ["facets", "sorts", "attributes"];
    const want = v3_request.limit ?? DEFAULT_LIMIT;
    const offset = (v3_request.cursor && this.#cursor_offsets.get(v3_request.cursor)) || 0;
    const request_with = (sent: readonly FilterClause[]): BrowseRequest => ({
      ...base,
      ...(sent.length ? { filter_by: sent.map(clause => clause.clause_).join(" && ") } : {}),
      ...(sort ? { sort } : {}),
      ...(v3_request.cursor ? { cursor: v3_request.cursor } : {}),
      include,
      ...(want !== DEFAULT_LIMIT ? { limit: Math.min(want, BROWSE_MAX_LIMIT) } : {}),
    });

    let request = request_with(clauses);
    let answer = await this.#browse_answer(merchant, request);
    // Each retry leaves out at least one more clause, so this ends.
    while (!answer.body_) {
      const refused = rejected_clauses(answer.error_, clauses);
      if (!refused.length) return undefined;
      dwarn(
        "[NativeDepictAPI] leaving out filters V4 refused:",
        refused.map(clause => clause.clause_),
        answer.error_?.message
      );
      for (const clause of refused) rejected.add(clause.clause_);
      clauses = clauses.filter(clause => !refused.includes(clause));
      request = request_with(clauses);
      answer = await this.#browse_answer(merchant, request);
    }
    let response = answer.body_;
    // A page over V4's largest is its pages chained by their cursors; later pages ask for products alone.
    while (want > BROWSE_MAX_LIMIT && response.products.length < want && response.cursor !== undefined) {
      const page = await this.#browse_page(merchant, {
        ...request,
        cursor: response.cursor,
        limit: Math.min(want - response.products.length, BROWSE_MAX_LIMIT),
        include: ["attributes"],
      });
      if (!page) return undefined;
      if (!page.products.length) break;
      response = {
        ...response,
        products: [...response.products, ...page.products],
        ...(page.cursor !== undefined ? { cursor: page.cursor } : { cursor: undefined }),
      };
    }
    if (response.cursor === undefined) delete response.cursor;

    index.learn_(response.facets);
    if (response.cursor !== undefined) {
      this.#cursor_offsets.set(response.cursor, offset + response.products.length);
    }
    return native_browse_to_v3(response, door, offset);
  }

  async #listing(call: Extract<DepictAPIRawCall, { kind_: "listing" | "listing_products" }>) {
    const { merchant, market } = call.request_;
    const locale = to_bcp47(call.request_.locale);
    const by_external_id = call.id_type_ === IdTypes.EXTERNAL_ID;
    const path = by_external_id ? "/listings" : "/listings/" + encodeURIComponent(call.id_to_query_for_);
    const response = await this.#get_json<ListingResponse>(
      this.#merchant_url(merchant, path) +
        "?" +
        flat_query_string([
          ["market", market],
          ["locale", locale],
          ["external_id", by_external_id ? call.id_to_query_for_ : undefined],
        ])
    );
    return response && native_listing_to_v3(response.listing);
  }

  async #suggest(v3_request: { merchant: string; market: string; locale: string; query?: string | null }) {
    const { merchant, market } = v3_request;
    const locale = to_bcp47(v3_request.locale);
    const response = await this.#get_json<SuggestResponse>(
      this.#merchant_url(merchant, "/suggest") +
        "?" +
        flat_query_string([
          ["market", market],
          ["locale", locale],
          ["query", v3_request.query ?? ""],
        ])
    );
    if (!response) return undefined;
    const needs_ancestors = response.suggestions.some(
      suggestion => suggestion.type === "listing" && suggestion.path.length > 0
    );
    return native_suggest_to_v3(
      response,
      needs_ancestors ? await this.#ancestors(merchant, market, locale) : undefined
    );
  }

  /** V4 suggestions name ancestors by title only; the listing tree names them by id. A failed read isn't retried. */
  #ancestors(merchant: string, market: string, locale: string | undefined) {
    const key = JSON.stringify([merchant, market, locale]);
    let lookup = this.#ancestor_lookups.get(key);
    if (!lookup) {
      lookup = this.#get_json<ListingTreeResponse>(
        this.#merchant_url(merchant, "/listings") +
          "?" +
          flat_query_string([
            ["market", market],
            ["locale", locale],
          ])
      ).then(tree => tree && ancestors_from_tree(tree.listings));
      this.#ancestor_lookups.set(key, lookup);
    }
    return lookup;
  }
}

/** The v3 search or listing-products request DepictAPI hands its transport. */
type V3BrowseRequest = {
  merchant: string;
  market: string;
  locale: string;
  query?: string;
  filters?: unknown[];
  sort?: { field: string; order: "asc" | "desc" };
  cursor?: string;
  limit?: number;
};

/** A DepictAPI for `version`: v3, or the native V4 API. */
export function create_depict_api<InputDisplay extends Display, OutputDisplay extends ModernDisplay | never>(
  version: DepictAPIVersion | undefined,
  options: DepictAPIConstructorOptions<InputDisplay, OutputDisplay>
): DepictAPI<InputDisplay, OutputDisplay> {
  return version === "v4"
    ? new NativeDepictAPI<InputDisplay, OutputDisplay>(options)
    : new DepictAPI<InputDisplay, OutputDisplay>(options);
}
