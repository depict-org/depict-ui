import { DepictAPI } from "@depict-ai/ui";
import { dlog, get_depict_id, get_user_id } from "@depict-ai/utilishared";

const tenant = "oscarjacobson";
const cache_key = "oj";
const market = "sv-se";

// How to use: adjust above, run this script in the browser, then once it prints "Built urls" to the console, run copy(urls) and download all the urls using aria2c or wget

main();

async function main() {
  if (
    !confirm(
      `Warming cache for tenant: ${JSON.stringify(tenant)}, cache key: ${JSON.stringify(
        cache_key
      )} market: ${JSON.stringify(market)}`
    )
  ) {
    return;
  }
  // Get all image urls
  const image_urls = new Set<string>();
  const api = new DepictAPI();
  const first_result = await api.query({
    "dsid": get_depict_id(),
    "limit": 100,
    "market": market,
    "query": "",
    tenant,
    "user_id": get_user_id(),
  });
  first_result.displays.map(({ image_url }) => image_urls.add(image_url as string));
  let cursor = first_result.cursor;
  while (cursor) {
    const next_result = await api.query({
      "dsid": get_depict_id(),
      "limit": 100,
      "market": market,
      "query": "",
      tenant,
      "user_id": get_user_id(),
      cursor,
    });
    next_result.displays.forEach(({ image_url }) => image_urls.add(image_url as string));
    cursor = next_result.cursor;
  }
  const formats = ["webp", "jpeg"];
  const resolutions = [64, 128, 256, 300, 400, 512, 1024, 2048, 4096];
  const to_fetch: string[] = [];
  for (const src of image_urls) {
    for (let i = 0; i < formats.length; i++) {
      // Much faster than .map and this will run kinda often
      const format = formats[i];
      to_fetch.push(...make_urls(src, format, resolutions));
    }
  }
  dlog("Built urls");
  // @ts-ignore
  window.urls = to_fetch.join("\n");
}

function make_urls(url: string, format: string, resolutions: number[]) {
  return resolutions.map(width => `${optimized_img_url_generator(format, url, width)}`);
}

function optimized_img_url_generator(format: string, url: string, width: number) {
  // using make_url_with_query_params takes ~100ms on CDON with 2 surfaces and hover images, we can't afford that when it could be essentially free
  return `https://img.depict.ai/ResizeImage/${cache_key}?format=${format}&url=${encodeURIComponent(
    url
  )}&width=${width}`;
}
