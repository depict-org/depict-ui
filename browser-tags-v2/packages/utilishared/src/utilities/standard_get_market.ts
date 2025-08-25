/**
 * Tries to figure out the tenant's market (`TwoLetterMarket` for new integrations) through various means.
 *
 * 1. Checks if there is a market in one of the url segments (www.tentant.se/foo/se/bar)
 * 2. Checks if the market is specified in the tenant's domain name (www.tenant-se.com)
 * 3. Checks the toplevel domain (www.tenant.se/foo/bar)
 *
 * @param allowed_markets An array the possible markets for the tenant.
 *    Dont forget to specify the allowed market as const (`["se", "en"] as const`) to get the best typing
 * @param url Specify this to overide the url to check, defaults to the current url
 * @param tenant The tenant's name
 * @returns If a market specified in `allowed_markets`was found that is returned, `undefined` otherwise
 */
export function standard_get_market<T extends readonly string[]>(
  allowed_markets: T,
  url?: string,
  tenant: string = process.env.TENANT
): T[number] | undefined {
  const u_o = url ? new URL(url) : location;
  const { hostname } = u_o;
  const is_demosite = process.env.DEBUG === "true" && hostname.endsWith("demo.depict.ai");

  // strategy 0: demo sites
  if (is_demosite) {
    const last_in_orig_site = hostname.replace("demo.depict.ai", "").split("-").pop();
    if (allowed_markets.includes(last_in_orig_site!)) {
      return last_in_orig_site!;
    }
  }

  // strategy 1 pathname startsWith

  const { pathname } = u_o;
  const market = allowed_markets.find(v => pathname.startsWith("/" + v + "/") || pathname === "/" + v) as T[number];
  if (market) {
    return market;
  }

  // strategy 2 <tenant><divider><market>
  if (tenant) {
    const e = new RegExp(tenant + "[.-]" + `(${allowed_markets.join("|")})`);
    const matches = hostname.match(e);

    if (matches?.[1]) {
      return matches[1] as T[number];
    }
  }

  // strategy 3 top level domain
  const tld = hostname.split(".").pop();
  if (allowed_markets.includes(tld!)) {
    return tld as T[number];
  }

  // strategy 4 html lang attribute
  const lang_attr = document.documentElement.lang;
  if (lang_attr) {
    const e = new RegExp(`${allowed_markets.join("|")}`);
    const matches = lang_attr.toLowerCase().match(e);
    if (matches?.[0]) {
      return matches[0] as T[number];
    }
  }

  if (is_demosite) {
    // hail mary attempt to get something to run
    return "se";
  }
}
