import type { GetListingResponse, ProductListing } from "@depict-ai/types/api/GetListingResponse";
import type {
  ListingSuggestion,
  QuerySuggestion,
  SearchSuggestionsResponseV3,
} from "@depict-ai/types/api/SearchSuggestionsResponseV3";
import type {
  BrowseRequest,
  BrowseResponse,
  ListingHeader,
  ListingNode,
  ListingRef,
  SuggestResponse,
} from "./v4_types";
import { native_card_to_display, TrackingIdKey } from "./cards";
import { native_content_to_v3, native_facets_to_v3, native_sorts_to_v3 } from "./filters";

type CollectionType = GetListingResponse["listing_type"];

/**
 * A browse answer as v3's `/search/results` or `/listings/{id}/products` answer.
 *
 * `total` (v3 `n_hits`): V4 leaves it out when it can't vouch for it (depict-544l). Like the facade, the adapter then
 * sends the lower bound it can see, the products before this page plus this page's (`offset`), so the result count
 * still shows a number. Only the count shown before every page has loaded is affected: once all are loaded the UI
 * counts the rendered products (useCountOfProductsForUI).
 *
 * `is_fallback`: V4 has no such field, so it is `null`, which the UI reads as "not a fallback" (no "no exact matches"
 * notice), never as a fallback.
 */
export function native_browse_to_v3(
  response: BrowseResponse,
  door: "search" | "listing",
  offset: number
): Record<string, unknown> {
  const tracking_key: TrackingIdKey = door === "search" ? "search_result_id" : "product_listing_result_id";
  return {
    n_hits: response.total ?? offset + response.products.length,
    sorts: native_sorts_to_v3(response.sorts ?? []),
    filters: native_facets_to_v3(response.facets ?? [], response.currency),
    ...(door === "search"
      ? {
          search_request_id: response.request_id,
          content_search_links: native_content_to_v3(response.content ?? []),
          is_fallback: null,
        }
      : { product_listing_request_id: response.request_id }),
    ...(response.cursor !== undefined ? { cursor: response.cursor } : {}),
    displays: response.products.map(product => native_card_to_display(product, tracking_key)),
  };
}

function listing_ref_to_v3(
  ref: ListingRef,
  listing_type: CollectionType,
  show: { show_in_breadcrumbs: boolean; show_in_quicklinks: boolean }
): ProductListing {
  return {
    listing_id: ref.id,
    ...(ref.external_id !== undefined ? { external_id: ref.external_id } : {}),
    listing_type,
    ...show,
    image_urls: [],
    title: ref.title,
    ...(ref.slug !== undefined ? { slug: ref.slug } : {}),
  };
}

/**
 * A native listing header as v3's `GET /listings/{id}`, so depict-ui's breadcrumb and quick link builder
 * (create_quicklinks_and_breadcrumbs_and_run_transformer) and the `categories` transformer keep working.
 *
 * V4 serves breadcrumbs and quick links precomputed, as references only, where v3 has every ancestor, sibling and
 * child with its type, images and show flags. So:
 * - `ancestors` are the shown breadcrumbs (hidden ancestors are gone), typed `category`, without images.
 * - `quick_links` are siblings when the listing is among them (V4 lists the listing itself among its siblings), else
 *   children; they get the listing's type and no images.
 * - `show_in_quicklinks` of the listing itself isn't served; it's `true`.
 */
export function native_listing_to_v3(listing: ListingHeader): GetListingResponse {
  const listing_type = listing.type as CollectionType;
  const quick_links_are_siblings = listing.quick_links.some(link => link.id === listing.id);
  const quick_links = listing.quick_links.map(link =>
    listing_ref_to_v3(link, listing_type, { show_in_breadcrumbs: true, show_in_quicklinks: true })
  );
  return {
    listing_id: listing.id,
    ...(listing.external_id !== undefined ? { external_id: listing.external_id } : {}),
    listing_type,
    show_in_breadcrumbs: listing.show_in_breadcrumbs,
    show_in_quicklinks: true,
    image_urls: listing.images,
    title: listing.title,
    ...(listing.slug !== undefined ? { slug: listing.slug } : {}),
    ancestors: listing.breadcrumbs.map(ref =>
      listing_ref_to_v3(ref, "category", { show_in_breadcrumbs: true, show_in_quicklinks: true })
    ),
    siblings: quick_links_are_siblings ? quick_links : [],
    children: quick_links_are_siblings ? [] : quick_links,
    content_blocks: listing.content_blocks as GetListingResponse["content_blocks"],
  };
}

/** A listing's ancestors as v3 lists them (root first), by listing id; undefined when the listing isn't known. */
export type AncestorLookup = (listing_id: string) => ProductListing[] | undefined;

/**
 * Every listing's ancestors from V4's listing tree (`GET /v4/{merchant}/listings`): the tree is the only V4 answer that
 * names a listing's ancestors by id. Tree nodes carry no images or show flags, so ancestors have no images and are
 * shown.
 */
export function ancestors_from_tree(tree: readonly ListingNode[]): AncestorLookup {
  const by_id = new Map<string, ProductListing[]>();
  const walk = (nodes: readonly ListingNode[], chain: ProductListing[]) => {
    for (const node of nodes) {
      if (!by_id.has(node.id)) by_id.set(node.id, chain);
      walk(node.children, [
        ...chain,
        listing_ref_to_v3(node, node.type as CollectionType, { show_in_breadcrumbs: true, show_in_quicklinks: true }),
      ]);
    }
  };
  walk(tree, []);
  return listing_id => by_id.get(listing_id);
}

/**
 * A native suggest answer as v3's `/search/suggestions`. V4 suggestions carry no tracking id, so
 * `suggestions_result_id` is empty. A listing suggestion names its ancestors by title only (`path`), so their ids,
 * slugs and types come from `ancestors_of` (the listing tree), checked against `path`; without it, or when the tree
 * disagrees, the suggestion has no `ancestors` and its breadcrumbs are left out.
 */
export function native_suggest_to_v3(
  response: SuggestResponse,
  ancestors_of?: AncestorLookup
): SearchSuggestionsResponseV3 {
  return {
    suggestions_request_id: response.request_id,
    suggestions: response.suggestions.map(suggestion => {
      if (suggestion.type === "query") {
        return { type: "query", query: suggestion.query, suggestions_result_id: "" } as QuerySuggestion;
      }
      const from_tree = ancestors_of?.(suggestion.listing.id);
      const ancestors = from_tree && same_titles(from_tree, suggestion.path) ? from_tree : ([] as ProductListing[]);
      return {
        type: "listing",
        listing_id: suggestion.listing.id,
        ...(suggestion.listing.external_id !== undefined ? { external_id: suggestion.listing.external_id } : {}),
        listing_type: suggestion.listing.type as CollectionType,
        show_in_breadcrumbs: true,
        show_in_quicklinks: true,
        image_urls: suggestion.listing.images,
        title: suggestion.listing.title,
        ...(suggestion.listing.slug !== undefined ? { slug: suggestion.listing.slug } : {}),
        suggestions_result_id: "",
        ancestors,
      } as ListingSuggestion;
    }),
  };
}

const same_titles = (ancestors: readonly ProductListing[], path: readonly string[]) =>
  ancestors.length === path.length && ancestors.every((ancestor, index) => ancestor.title === path[index]);

/** `encodeURIComponent`, as V4's own encoder writes a value (`+` would mean a space). */
const encode = (value: string) => encodeURIComponent(value);

/**
 * A browse request as V4's canonical GET query string (realtime `v4/worker/src/requests.ts` `encodeBrowse`). V4
 * rejects any parameter it doesn't know with a 400, so nothing else may be added (no version params, no session).
 */
export function browse_query_string(request: BrowseRequest): string {
  const pairs = [`market=${encode(request.market)}`];
  const add = (key: string, value: string | undefined) => value !== undefined && pairs.push(`${key}=${value}`);
  add("locale", request.locale === undefined ? undefined : encode(request.locale));
  add("query", request.query === undefined ? undefined : encode(request.query));
  if (request.listing && "id" in request.listing) add("listing", encode(request.listing.id));
  else if (request.listing) add("listing_external_id", encode(request.listing.external_id));
  add("filter_by", request.filter_by === undefined ? undefined : encode(request.filter_by));
  if (request.sort) add("sort", `${encode(request.sort.field)}.${request.sort.order}`);
  add("include", request.include?.join(","));
  add("cursor", request.cursor);
  add("limit", request.limit === undefined ? undefined : String(request.limit));
  return pairs.join("&");
}

/** Flat parameters (suggest, listing) in the given order; undefined ones are left out. */
export function flat_query_string(params: [string, string | undefined][]): string {
  return params
    .filter((pair): pair is [string, string] => pair[1] !== undefined)
    .map(([key, value]) => `${key}=${encode(value)}`)
    .join("&");
}

/** depict-ui's backend locale (`sv_SE`) as a BCP 47 tag; V4 tolerates the underscore, this is its canonical form. */
export function to_bcp47(locale: string | undefined): string | undefined {
  return locale ? locale.replace(/_/g, "-") : undefined;
}
