import { dlog } from "@depict-ai/utilishared";

let last_sent_value: string | undefined;

export function send_search_query_to_ga(url: URL | Location) {
  // @ts-ignore
  if (typeof ga !== "function" || process.env.GA === "false") {
    return;
  }
  const new_value = url.pathname + url.search + url.hash;
  if (last_sent_value === new_value) {
    // don't send the same event twice in a row
    return;
  }
  last_sent_value = new_value;
  const args = ["depict.send", "pageview", new_value];
  dlog("Calling ga with args", ...args);
  // @ts-ignore
  ga(...args);
}
