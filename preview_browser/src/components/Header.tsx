import {
  async_iterable_ipns,
  catchify,
  dlog,
  fetch_replacer,
  GeneralSideSlidein,
  IPNS,
  Node_Array,
  report,
} from "@depict-ai/utilishared/latest";
import { get_locale, get_market, get_merchant } from "~/helpers/url_state";
import { CrossIcon, general_modal_abstraction, media_query_to_accessor, SearchField } from "@depict-ai/ui/latest";
import {
  createComputed,
  createEffect,
  createMemo,
  createRoot,
  createSignal,
  For,
  getOwner,
  onCleanup,
  runWithOwner,
  Show,
} from "solid-js";
import { Cart } from "~/components/Cart";
import { createStore, reconcile } from "solid-js/store";
import { HeadersModalElements } from "~/components/HeadersModalElements";
import {
  base_url_param_name,
  cart_param_name,
  collections_category_listing_id_param_name,
  headers_param_name,
  product_id_source_param_name,
  recommendation_rows_param_name,
} from "~/helpers/query_params";
import { get_instant_current_url_as_object } from "~/helpers/get_instant_current_url_as_object";
import { use_set_search_param } from "~/helpers/set_search_param";
import { get_available_markets_or_locales } from "~/helpers/get_available_markets_or_locales";
import { useNavigate } from "@solidjs/router";
import { useTopLevelContext } from "~/helpers/useTopLevelContext";
import { darkmodeBlocked, osDark } from "~/helpers/darkmodeBlocked";

export const default_base_url = "https://api.depict.ai";
let replacement_base_url: string | undefined | null = new URLSearchParams(location.search)?.get(base_url_param_name);

export const get_base_url = () => replacement_base_url || default_base_url;

let extra_headers_used_in_api_request: { [key: string]: string } = {};

export function Header() {
  const { depict_search, is_actually_routing } = useTopLevelContext()!;
  const navigate = useNavigate();
  const commit_new_path_value = (value: string | undefined, index: 1 | 2 | 3) => {
    const u_o = new URL(location.href);
    const split_pathname = u_o.pathname.split("/");
    const { searchParams } = u_o;
    split_pathname[index] = value || "null";
    if (index === 1) split_pathname[2] = "null"; // reset market if merchant changed
    if (index === 1) split_pathname[3] = "null"; // reset locale if merchant changed
    searchParams.delete(collections_category_listing_id_param_name); // reset category query_id because it has a high chance of being invalid
    if (index === 1) {
      // if merchant changed delete everything that could be merchant related
      searchParams.delete(cart_param_name); // clear cart too
      searchParams.delete(product_id_source_param_name); // reset currently selected product
      searchParams.delete(recommendation_rows_param_name);
    }
    u_o.pathname = split_pathname.join("/");
    navigate(u_o.pathname + u_o.search + u_o.hash, {
      scroll: false,
    });
  };
  const locales = get_available_markets_or_locales("locales");
  const markets = get_available_markets_or_locales("markets");
  const current_location = get_instant_current_url_as_object();
  const current_base_url = createMemo(() => current_location().searchParams.get(base_url_param_name) ?? "");
  const cart_ids = createMemo<string[]>(() => JSON.parse(current_location().searchParams.get(cart_param_name) || "[]"));
  const [get_header_expanded, set_header_expanded] = createSignal(true);
  const wide = media_query_to_accessor("(min-width: 600px)");
  const app_owner = getOwner()!;
  const headers_store = createStore<{ [key: string]: string }>({});
  const [headers, set_headers] = headers_store;
  const set_search_param = use_set_search_param(is_actually_routing);
  const [getDarkModeBlocked, setDarkModeBlocked] = darkmodeBlocked;
  let merchant_input: HTMLInputElement;
  let base_url_input: HTMLInputElement;
  let open_headers_modal: VoidFunction;

  createEffect(() => (localStorage.darkmodeBlocked = getDarkModeBlocked()));

  createEffect(() => {
    extra_headers_used_in_api_request = JSON.parse(JSON.stringify(headers)); // clone deep, getting rid of the proxies, so that fetch requests that we intercept don't accidentally become tracking
    delete extra_headers_used_in_api_request[""]; // If someone accidentally added an empty header, remove it
    const json = JSON.stringify(extra_headers_used_in_api_request);
    set_search_param(headers_param_name, json === "{}" ? undefined : json, true);
  });

  createComputed(() =>
    set_headers(reconcile(JSON.parse(current_location().searchParams.get(headers_param_name) || "{}")))
  );

  general_modal_abstraction(HeadersModalElements, { headers_store }).then(
    ({ open_modal_ }) => (open_headers_modal = open_modal_)
  );
  createComputed(() => (replacement_base_url = current_base_url()));
  createComputed(() => wide() && set_header_expanded(true));

  return (
    <div
      class="page_header"
      ref={el => {
        const ro = new ResizeObserver(
          catchify(() => {
            document.body.style.paddingTop = `${el.offsetHeight}px`;
          })
        );
        ro.observe(el);
        onCleanup(() => ro.disconnect());
      }}
    >
      <Show when={!wide()}>
        <a
          href="javascript:void(0)"
          class="expand_collapse"
          onClick={catchify(() => set_header_expanded(prev => !prev))}
        >
          {get_header_expanded() ? "Collapse" : "Expand"} header
        </a>
      </Show>
      <Show when={get_header_expanded()}>
        <input
          type="text"
          placeholder="merchant"
          value={get_merchant() ?? ""}
          ref={merchant_input!}
          onChange={catchify(() => commit_new_path_value(merchant_input.value, 1))}
          title="Merchant to send to the API"
        />
        <div class="select_wrapper">
          <select
            ref={el => createEffect(() => (el.value = (markets(), get_market() || "")))}
            title="Market to send to the API"
            onChange={catchify(e => commit_new_path_value(e.currentTarget.value, 2))}
          >
            <option value="" selected={!get_merchant()}>
              Select market
            </option>
            <For each={markets()}>{market => <option value={market}>{market}</option>}</For>
          </select>
        </div>
        <div class="select_wrapper">
          <select
            ref={el => createEffect(() => (el.value = (locales(), get_locale() || "")))}
            title="Locale to send to the API and use for UI"
            onChange={catchify(e => commit_new_path_value(e.currentTarget.value, 3))}
          >
            <option value="" selected={!get_locale()}>
              Select locale
            </option>
            <For each={locales()}>{locale => <option value={locale}>{locale}</option>}</For>
          </select>
        </div>
        <input
          type="text"
          ref={base_url_input!}
          list="urls"
          placeholder="Override BASE_URL"
          title="BASE_URL to send the requests to"
          value={current_base_url()}
          onChange={catchify(() => {
            const new_url = new URL(location.href);
            const { value } = base_url_input;
            const { searchParams } = new_url;
            if (!value.startsWith("http://") && !value.startsWith("https://") && value !== "") {
              base_url_input.value = current_base_url();
              alert("BASE_URL must start with http:// or https://");
              return;
            }
            if (value) {
              searchParams.set(base_url_param_name, value);
            } else {
              searchParams.delete(base_url_param_name);
            }

            location.href = new_url.href;
          })}
        />
        <datalist id="urls">
          <option value="http://localhost:9100" />
        </datalist>
        <Show
          when={
            depict_search.market &&
            depict_search.merchant &&
            depict_search.localization?.backend_locale_ &&
            get_locale()
          }
        >
          <SearchField depict_search={depict_search} />
        </Show>
        <div class="depict plp header_overrides">
          <button class="minor" onClick={catchify(() => open_headers_modal())}>
            Configure additional headers
          </button>
        </div>
        <Show when={osDark()}>
          <div class="depict plp darkmode-blocker">
            <input
              type="checkbox"
              checked={getDarkModeBlocked()}
              id="darkmode-blocked"
              onChange={({ currentTarget }) => setDarkModeBlocked(currentTarget.checked)}
            />
            <label for="darkmode-blocked">Block darkmode</label>
          </div>
        </Show>
        <div class="depict plp open_cart">
          <button
            class="minor"
            onClick={catchify(async () => {
              let dispose_els: VoidFunction;
              const slideout_owner = runWithOwner(app_owner, () =>
                createRoot(dispose => ((dispose_els = dispose), getOwner()!))
              )!;
              const title_ipns = async_iterable_ipns<string | Node_Array>();
              title_ipns("Cart");
              const { on_close_ } = await GeneralSideSlidein({
                title_: title_ipns as IPNS<string>,
                children: runWithOwner(slideout_owner, () =>
                  Cart({ depict_search, cart_ids, is_actually_routing })
                ) as HTMLDivElement,
                CloseIcon: () => runWithOwner(slideout_owner, CrossIcon)!,
              });
              runWithOwner(slideout_owner, () =>
                createEffect(() =>
                  title_ipns([
                    document.createTextNode(`Cart (${cart_ids().length})`),
                    (
                      <a href="javascript:void(0)" onClick={catchify(() => set_search_param(cart_param_name, "[]"))}>
                        Clear
                      </a>
                    ) as HTMLAnchorElement,
                  ])
                )
              );
              on_close_(dispose_els!);
            })}
          >
            Open Cart ({cart_ids().length})
          </button>
        </div>
      </Show>
    </div>
  );
}

if (typeof window !== "undefined") {
  // This is value first for now, we can do this properly later when it breaks
  /**
   * Requests new displays by setting a header to all requests going to depict
   * Only temporary for while we're transitioning to new displays
   * We always want to get them when available, since they're more stable
   */

  fetch_replacer((target, this_arg, arg_list) => {
    const [first_arg, second_arg] = arg_list;

    header_modification: {
      // We only want to modify depict made requests, and we know what we always provide strings or URL objects as first argument
      if (first_arg instanceof Request) break header_modification;
      let href: string;
      try {
        ({ href } = first_arg instanceof URL ? first_arg : new URL(first_arg as string, location.origin));
      } catch (e) {
        dlog("Failed to parse URL", e, first_arg);
        break header_modification;
      }
      if (!href.includes(get_base_url())) {
        break header_modification;
      }
      const new_second_arg = { ...(second_arg || {}) };
      const headers = second_arg?.headers || {};
      if (headers instanceof Headers) {
        for (const key in extra_headers_used_in_api_request) {
          headers.set(key, extra_headers_used_in_api_request[key]);
        }
      } else {
        Object.assign(headers, extra_headers_used_in_api_request);
      }
      new_second_arg.headers = headers;
      arg_list[1] = new_second_arg;
    }
    return Reflect.apply(target, this_arg, arg_list);
  }, true);

  fetch_replacer((target, this_arg, arg_list) => {
    // John wanted to be able to change process.env.BASE_URL without having to run this locally because he wants to be on another branch so this hack is dedicated to him
    try {
      if (replacement_base_url) {
        const [param0] = arg_list;
        if (typeof param0 == "string") {
          arg_list[0] = param0.replaceAll(default_base_url, replacement_base_url);
        } else if (param0 instanceof Request) {
          arg_list[0] = new Request(param0.url.replaceAll(default_base_url, replacement_base_url), param0);
        } else if (param0 instanceof URL) {
          param0.href = param0.href.replaceAll(default_base_url, replacement_base_url);
        }
      }
    } catch (e: any) {
      report(e, "warning");
    }
    return Reflect.apply(target, this_arg, arg_list);
  }, true);
}
