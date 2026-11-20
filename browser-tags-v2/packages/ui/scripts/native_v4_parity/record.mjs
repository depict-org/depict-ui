// Records a store's v3 and native V4 answers to the same requests, for the native adapter's whole-card diff
// (parity.parity.ts, next to the adapter). Reads production: requests are sequential, spaced, and flagged
// `x-depict-fleet-probe: 1`. Keep case files small.
//
//   node scripts/native_v4_parity/record.mjs scripts/native_v4_parity/depictcentra.json <out dir>
//
// A case file is { merchant, market, locale, cases: [...] }, each case one of
//   { name, kind: "search", query, sort?, filters?, filter_by? }
//   { name, kind: "listing", id? | external_id?, sort?, filters?, filter_by? }   (products and header)
//   { name, kind: "suggest", query }
// `filters` is the v3 request's; `filter_by` is what the adapter sends for them (its unit tests pin that translation).
import fs from "node:fs";
import path from "node:path";

const [casesPath, outDir] = process.argv.slice(2);
if (!casesPath || !outDir) throw new Error("usage: record.mjs <cases.json> <out dir>");
const {
  merchant,
  market,
  locale,
  cases,
  base = "https://api.depict.ai",
} = JSON.parse(fs.readFileSync(casesPath, "utf8"));
const bcp47 = locale.replace(/_/g, "-");
const headers = { "x-depict-fleet-probe": "1" };
const SPACING_MS = 1200;
fs.mkdirSync(outDir, { recursive: true });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const enc = encodeURIComponent;

async function read(url, init = {}) {
  await sleep(SPACING_MS);
  const response = await fetch(url, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  const body = await response.json().catch(() => null);
  if (response.status !== 200) console.warn(response.status, url, JSON.stringify(body)?.slice(0, 300));
  return { status: response.status, url, body };
}

function browseUrl(c, include) {
  const pairs = [`market=${enc(market)}`, `locale=${enc(bcp47)}`];
  if (c.query) pairs.push(`query=${enc(c.query)}`);
  if (c.id) pairs.push(`listing=${enc(c.id)}`);
  if (c.external_id) pairs.push(`listing_external_id=${enc(c.external_id)}`);
  if (c.filter_by) pairs.push(`filter_by=${enc(c.filter_by)}`);
  if (c.sort && c.sort.field !== "_relevance") {
    const v4 = { sale_price: "price", product_timestamp: "newest" }[c.sort.field] ?? c.sort.field;
    pairs.push(`sort=${enc(v4)}.${c.sort.order}`);
  }
  pairs.push(`include=${include}`);
  return `${base}/v4/${enc(merchant)}/browse?${pairs.join("&")}`;
}

const v3Body = c => ({
  merchant,
  market,
  locale,
  ...(c.query !== undefined ? { query: c.query } : {}),
  ...(c.filters ? { filters: c.filters } : {}),
  ...(c.sort ? { sort: c.sort } : {}),
  limit: 24,
});

let tree;
for (const c of cases) {
  const record = { case: c, merchant, market, locale };
  if (c.kind === "search") {
    record.v3 = await read(`${base}/v3/search/results`, { method: "POST", body: JSON.stringify(v3Body(c)) });
    record.v4 = await read(browseUrl(c, "facets,sorts,content,attributes"));
  } else if (c.kind === "listing") {
    const v3Path = c.id ? `listings/${enc(c.id)}` : `listings/external_id/${enc(c.external_id)}`;
    record.v3 = await read(`${base}/v3/${v3Path}/products`, { method: "POST", body: JSON.stringify(v3Body(c)) });
    record.v4 = await read(browseUrl(c, "facets,sorts,attributes"));
    const query = `merchant=${enc(merchant)}&market=${enc(market)}&locale=${enc(locale)}`;
    record.v3_header = await read(`${base}/v3/${v3Path}?${query}`);
    record.v4_header = await read(
      c.id
        ? `${base}/v4/${enc(merchant)}/listings/${enc(c.id)}?market=${enc(market)}&locale=${enc(bcp47)}`
        : `${base}/v4/${enc(merchant)}/listings?market=${enc(market)}&locale=${enc(bcp47)}&external_id=${enc(
            c.external_id
          )}`
    );
  } else if (c.kind === "suggest") {
    record.v3 = await read(
      `${base}/v3/search/suggestions?merchant=${enc(merchant)}&market=${enc(market)}&locale=${enc(locale)}&query=${enc(
        c.query
      )}`
    );
    record.v4 = await read(
      `${base}/v4/${enc(merchant)}/suggest?market=${enc(market)}&locale=${enc(bcp47)}&query=${enc(c.query)}`
    );
    // The adapter names a listing suggestion's ancestors from the listing tree, read once a page load.
    tree ??= await read(`${base}/v4/${enc(merchant)}/listings?market=${enc(market)}&locale=${enc(bcp47)}`);
    record.v4_tree = tree;
  }
  fs.writeFileSync(path.join(outDir, `${c.name}.json`), JSON.stringify(record, null, 1));
  console.log("recorded", c.name);
}
