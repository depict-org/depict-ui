import { Accessor, createMemo } from "solid-js";
import { get_locale, get_market, get_merchant } from "~/helpers/url_state";
import { get_location_href } from "~/helpers/get_location_href";

export function link_to_pathname(pathname: string | Accessor<string>, delete_query_params?: string[]) {
  const href = get_location_href();
  return createMemo(() => {
    const u_o = new URL(href());
    delete_query_params?.forEach(param => u_o.searchParams.delete(param));
    u_o.pathname = `/${encodeURIComponent(get_merchant())}/${encodeURIComponent(get_market())}/${encodeURIComponent(
      get_locale()
    )}/${typeof pathname === "function" ? pathname() : pathname}`;
    return u_o.pathname + u_o.search + u_o.hash;
  });
}
