/**
 * The listing_id parameter of category and collection pages
 */
export const collections_category_listing_id_param_name = "listing_id";
/**
 * The query parameter containing the cart contents
 */
export const cart_param_name = "cart";
/**
 * The query parameter that contains the current product id for the "Product ID" id source option on the recommendation page
 */
export const product_id_source_param_name = "product_id";
/**
 * Which recommendations are configured to be shown on the recommendation page
 */
export const recommendation_rows_param_name = "recommendation_rows";

/**
 * ID used for category id recommendation target
 */
export const category_id_param_name = "category_id";
/**
 * BASE URL - Where to send API requests to
 */
export const base_url_param_name = "BASE_URL";
/**
 * Override headers to set
 */
export const headers_param_name = "headers";

/**
 * Hosts the BASE_URL override (see {@link base_url_param_name}) is allowed to point at.
 *
 * An entry starting with a dot is a domain suffix: it matches that domain and any subdomain of it.
 * An entry without a leading dot must match the hostname exactly — otherwise "localhost" would also
 * allow hosts like "notlocalhost", which is precisely what this list exists to prevent.
 *
 * Ports are not part of a hostname, so every entry is port-tolerant and the http://localhost:9100
 * suggestion the header ships keeps working.
 *
 * Two things this list deliberately does not do:
 *
 * "localhost" is kept even though a crafted link can then aim a visitor's browser at a service on
 * their own machine. Removing it breaks the datalist suggestion the header already ships, and the
 * alternatives are worse: honouring it only when typed is impossible (the input navigates, so the
 * value always arrives back through the query string), and gating it on the page's own origin would
 * break running the deployed preview browser against a local API. The residual risk is small —
 * cross-origin reads still need the local service to opt in via CORS — so it is accepted, not missed.
 *
 * Loopback literals (127.0.0.1, [::1]) and trailing-dot forms ("api.depict.ai.") are absent, so they
 * fail closed. Adding the loopback literals would widen exactly the surface described above for no
 * workflow anyone has asked for; the trailing dot is a form nobody writes by hand.
 */
export const ALLOWED_BASE_URL_HOST_SUFFIXES = [".depict.ai", "localhost"];

/**
 * Whether the BASE_URL override may be sent requests. The override arrives from the query string, so
 * anyone who can get a customer to open a demo.depict.ai link can otherwise choose which API that
 * page talks to — and the doors reflect the origin back in CORS, so the browser would let it through.
 *
 * Only absolute http(s) URLs on {@link ALLOWED_BASE_URL_HOST_SUFFIXES} are accepted. Parsing with URL
 * rather than matching the string is deliberate: it is what makes "https://api.depict.ai@evil.com"
 * and "https://api.depict.ai.evil.com" resolve to the host actually contacted.
 */
export function is_allowed_base_url(value: string | null | undefined) {
  if (!value) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false; // not an absolute URL, so we cannot know which host it would reach
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  // URL already lowercases hostname for us, so there is nothing to normalise here.
  const { hostname } = parsed;
  return ALLOWED_BASE_URL_HOST_SUFFIXES.some(entry =>
    entry.startsWith(".") ? hostname === entry.slice(1) || hostname.endsWith(entry) : hostname === entry
  );
}
