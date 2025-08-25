import {
  DepictSearch,
  fetchDepictRecommendations,
  ModernDisplayWithPageUrl,
  RecommendationGrid,
  RecommendationSlider,
  ShopTheLookButton,
} from "@depict-ai/ui/latest";
import {
  catchify,
  Display,
  dlog,
  dwarn,
  fetch_retry,
  make_random_classname,
  ModernDisplay,
  random_string,
} from "@depict-ai/utilishared/latest";
import { get_base_url } from "~/components/Header";
import {
  Accessor,
  createComputed,
  createEffect,
  createMemo,
  createResource,
  createRoot,
  createSignal,
  For,
  getOwner,
  Index,
  JSX,
  onCleanup,
  Owner,
  Resource,
  runWithOwner,
  Show,
  Suspense,
  untrack,
} from "solid-js";
import { get_locale, get_market, get_merchant } from "~/helpers/url_state";
import { createStore, reconcile } from "solid-js/store";
import { ProductCard } from "~/components/ProductCard";
import { HomeLink } from "~/components/HomeLink";
import { get_displays } from "~/components/Cart";
import {
  cart_param_name,
  category_id_param_name,
  product_id_source_param_name,
  recommendation_rows_param_name,
} from "~/helpers/query_params";
import { get_instant_current_url_as_object } from "~/helpers/get_instant_current_url_as_object";
import { use_set_search_param } from "~/helpers/set_search_param";
import { make_sdk_on_navigation_cb } from "~/helpers/make_sdk_on_navigation_cb";
import { Title } from "@solidjs/meta";
import { useSearchParams } from "@solidjs/router";
import { useTopLevelContext } from "~/helpers/useTopLevelContext";
import { cols_at_size } from "~/helpers/global_values";
import { Dynamic } from "solid-js/web";
import { display_transformers } from "~/helpers/url_creator_transformer";
import { useGap } from "~/helpers/GapProvider";

type RecommendationRow = {
  source?: "cart" | "general" | "product_id" | "category";
  type?: string;
  grid?: boolean;
  unique_id: string;
};

const kind_to_source = {
  "product": "product_id",
  "multi_product": "cart",
  "user_only": "general",
  "category": "category",
} as const;

export function RecommendationsPage() {
  const types = fetch_tenant_types();

  return (
    <main class="recommendations_page">
      <Title>Recommendations page</Title>
      <div class="upper_section">
        <HomeLink />
        <h1>Recommendations page</h1>
      </div>
      <Suspense fallback={"Loading available types"}>
        <PageContents types={types} />
      </Suspense>
    </main>
  );
}

function PageContents({ types }: { types: Resource<false | BackendTypeRes> }) {
  let user_changed_recommendation_rows = false;
  const { depict_search, is_actually_routing } = useTopLevelContext()!;
  const [recommendation_rows, set_recommendation_rows] = createStore<RecommendationRow[]>([]);
  const row_ids = createMemo(() => recommendation_rows.map(r => r.unique_id));
  const show_all = () => {
    const available_types = types();
    if (!available_types) return;
    const new_rows = available_types.map(t => ({
      unique_id: random_string(),
      source: kind_to_source[t.kind],
      type: t.name,
    }));
    set_recommendation_rows(() => new_rows);
  };
  const current_location = get_instant_current_url_as_object();

  const cart_ids_string = createMemo(() => current_location().searchParams.get(cart_param_name) ?? "[]"); // For diffing
  const cart_ids = createMemo<string[]>(() => JSON.parse(cart_ids_string()));
  const product_id = createMemo(() => current_location().searchParams.get(product_id_source_param_name));
  const set_search_param = use_set_search_param(is_actually_routing);

  createEffect(has_ran => {
    const new_value = JSON.stringify(recommendation_rows);
    dlog("store value,", new_value);
    set_search_param(recommendation_rows_param_name, new_value, true);
    if (has_ran) user_changed_recommendation_rows = true;
    return true;
  }, false);

  createComputed(() =>
    set_recommendation_rows(
      reconcile(JSON.parse(current_location().searchParams.get(recommendation_rows_param_name) || "[]"))
    )
  );

  createEffect(() => {
    if (recommendation_rows.length) return;
    const types_value = types();
    if (!types_value || user_changed_recommendation_rows) return;
    untrack(show_all);
  });

  return (
    <>
      <div class="recs_browser depict plp">
        <CurrentProductAndProductIDSourceConfig
          depict_search={depict_search}
          is_actually_routing={is_actually_routing}
        />
        <h3>Recommendations</h3>
        <div class="main_buttons">
          <button
            class="add_row major"
            onClick={catchify(() => set_recommendation_rows(prev => [{ unique_id: random_string() }, ...prev]))}
          >
            Add row
          </button>
          <button class="show_all major" onClick={catchify(show_all)}>
            Show all
          </button>
        </div>

        <For each={row_ids()}>
          {(row_id, index) => {
            const row = createMemo(() => recommendation_rows.find(r => r.unique_id === row_id)!);
            const source_id = make_random_classname();
            const type_id = make_random_classname();
            const grid_id = make_random_classname();
            const available_types = createMemo(() => {
              const types_value = types();
              if (types_value === false) dwarn("Failed fetching types");
              if (!types_value) return new Set<string>();
              return new Set(types_value.map(t => kind_to_source[t.kind]));
            });

            return (
              <div class="row">
                <div class="header">
                  <div class="option">
                    <label for={source_id}>ID source:</label>
                    <select
                      id={source_id}
                      value={row().source || ""}
                      onChange={e => {
                        set_recommendation_rows(index(), "type", undefined);
                        set_recommendation_rows(
                          index(),
                          "source",
                          e.currentTarget.value as RecommendationRow["source"]
                        );
                      }}
                    >
                      <option value="">-</option>
                      {available_types().has("general") && (
                        <option value="general" selected={row().source === "general"}>
                          General (no ID)
                        </option>
                      )}
                      {available_types().has("cart") && (
                        <option value="cart" selected={row().source === "cart"}>
                          Cart
                        </option>
                      )}
                      {available_types().has("product_id") && (
                        <option value="product_id" selected={row().source === "product_id"}>
                          Product ID
                        </option>
                      )}
                      {available_types().has("category") && (
                        <option value="category" selected={row().source === "category"}>
                          Category
                        </option>
                      )}
                    </select>
                  </div>
                  <div class="option">
                    <label for={type_id}>Type:</label>
                    <select
                      id={type_id}
                      value={row().type || ""}
                      onChange={e => {
                        set_recommendation_rows(index(), "type", e.currentTarget.value as RecommendationRow["type"]);
                      }}
                    >
                      <option value="">{row().source ? "–" : "Select an ID source first"}</option>
                      <Index each={types()}>
                        {type =>
                          createMemo(() => {
                            if (row().source === kind_to_source[type().kind]) {
                              return (
                                <option value={type().name} selected={row().type === type().name}>
                                  {type().name}
                                </option>
                              );
                            }
                          }) as unknown as JSX.Element
                        }
                      </Index>
                    </select>
                  </div>
                  <div class="option">
                    <label for={grid_id}>Grid:</label>
                    <input
                      id={grid_id}
                      type="checkbox"
                      checked={row().grid}
                      onChange={e => {
                        set_recommendation_rows(index(), "grid", e.currentTarget.checked);
                      }}
                    />
                  </div>
                  <div class="option">
                    <button
                      class="delete_row major"
                      onClick={() => {
                        set_recommendation_rows(prev => prev.filter((_, i) => i !== index()));
                      }}
                    >
                      Delete row
                    </button>
                  </div>
                </div>
                <Show when={row().source && row().type} fallback="Please finish configuration">
                  <Show
                    when={!(row().source === "cart" && !cart_ids().length)}
                    fallback="Please add something to cart (i.e. click the add to cart button on a product card)"
                  >
                    <Show
                      when={!(row().source === "product_id" && !product_id())}
                      fallback="No product_id query parameter, click on a product card to set one"
                    >
                      <RecsComponent
                        row={row}
                        depict_search={depict_search}
                        cart_ids={cart_ids}
                        product_id={product_id}
                        is_actually_routing={is_actually_routing}
                      />
                    </Show>
                  </Show>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </>
  );
}

export function CurrentProductAndProductIDSourceConfig({
  depict_search,
  is_actually_routing,
  show_hackathon_shop_the_look = true,
}: {
  depict_search: DepictSearch<any>;
  is_actually_routing: Accessor<boolean>;
  show_hackathon_shop_the_look?: boolean;
}) {
  const [search_params, set_search_params] = useSearchParams();
  const onNavigation = make_sdk_on_navigation_cb();

  return (
    <>
      <h4>
        Product ID ID source{" "}
        <input
          type="text"
          value={search_params[product_id_source_param_name] || ""}
          placeholder="enter product_id"
          onChange={catchify(event =>
            set_search_params({
              ...Object.fromEntries(new URLSearchParams(location.search)),
              [product_id_source_param_name]: event.currentTarget.value,
            })
          )}
        />{" "}
        {search_params[product_id_source_param_name] && "current product:"}
      </h4>
      <Show when={search_params[product_id_source_param_name]}>
        {(() => {
          const display = get_displays(createMemo(() => [search_params[product_id_source_param_name]]));
          const owner = getOwner()!;

          return (
            <>
              <div class="current_product">
                <Suspense
                  fallback={ProductCard({
                    raw_display: null,
                    info: undefined,
                    localization: () => depict_search.localization,
                    is_actually_routing,
                  })}
                >
                  {(() => {
                    const display_value = createMemo(() => [...(display()?.values() || [])][0]);
                    return (
                      <Show when={display_value()} fallback="Didn't find display">
                        {
                          createMemo(() =>
                            ProductCard({
                              raw_display: display_value(),
                              info: undefined,
                              localization: () => depict_search.localization,
                              is_actually_routing,
                            })
                          ) as unknown as JSX.Element
                        }
                      </Show>
                    );
                  })()}
                </Suspense>
              </div>
              <Show when={show_hackathon_shop_the_look}>
                <ShopTheLookButton
                  buttonAttributes={{ class: "minor", style: { "align-self": "baseline" } }}
                  onNavigation={onNavigation}
                  productId={search_params[product_id_source_param_name]}
                  merchant={get_merchant()}
                  market={get_market()}
                  locale={get_locale()}
                  imageAspectRatio={1}
                  productCardTemplate={display =>
                    runEffectsInSuspense(
                      owner,
                      () =>
                        ProductCard({
                          raw_display: display,
                          info: undefined,
                          localization: () => depict_search.localization,
                          is_actually_routing,
                        }) as unknown as HTMLElement
                    )!
                  }
                />
              </Show>
            </>
          );
        })()}
      </Show>
    </>
  );
}

function RecsComponent({
  row,
  depict_search,
  cart_ids,
  product_id,
  is_actually_routing,
}: {
  row: Accessor<RecommendationRow>;
  depict_search: DepictSearch<Display>;
  cart_ids: Accessor<string[]>;
  product_id: Accessor<string | null>;
  is_actually_routing: Accessor<boolean>;
}) {
  const [search_params] = useSearchParams();
  const [recs, setRecs] = createSignal<Promise<ModernDisplayWithPageUrl<any>[]>>(
    new Promise<ModernDisplay[]>(() => {})
  );

  createEffect(
    catchify(async () => {
      const { source } = row();
      const id_opts =
        source === "product_id"
          ? ({ productId: product_id()! } as const)
          : source === "cart"
          ? ({ productIds: cart_ids() } as const)
          : source === "category"
          ? ({ categoryId: search_params[category_id_param_name] } as const) // leaving buggy search_params here since there's no use for this rn and bugs don't apply since it can't be written from the app anyway
          : ({} as const);
      const recs = fetchDepictRecommendations({
        merchant: get_merchant(),
        market: get_market(),
        locale: get_locale(),
        type: row().type!,
        headers: { "X-Debug": "true" },
        ...id_opts,
      });

      setRecs(
        recs.then(fetchedRecs =>
          display_transformers.products!({ displays: fetchedRecs, merchant: "", market: "", locale: "" })
        )
      );
    })
  );
  const spacing = useGap();

  return (
    <div class="recs">
      <Dynamic
        component={row().grid ? RecommendationGrid : RecommendationSlider}
        recommendations={recs() as Promise<Display[]>}
        cols_at_size={cols_at_size}
        grid_spacing={spacing()}
        product_card_template={(display: Display | null) =>
          ProductCard({
            raw_display: display,
            info: undefined,
            localization: () => depict_search.localization,
            is_actually_routing,
          }) as unknown as HTMLElement
        }
      ></Dynamic>
    </div>
  );
}

type BackendTypeKind = "user_only" | "product" | "category" | "multi_product";
type BackendTypeRes = { name: string; kind: BackendTypeKind }[];
export function fetch_tenant_types() {
  const [resource] = createResource(get_merchant, async merchant => {
    const response = (await fetch_retry(`${get_base_url()}/v2/recommend/surfaces?tenant=` + merchant).then(res =>
      !res ? res : res?.json()
    )) as BackendTypeRes | false;
    if (!response) return response;
    return response
      .map(item => {
        const our_entries = [item];
        if (item.kind === "multi_product") {
          // Backend now accepts product_id and product_ids for all types but that's not reflected in the surfaces endpoint, therefore we add it here
          our_entries.push({ ...item, kind: "product" });
        }
        return our_entries;
      })
      .flat();
  });
  return resource;
}

/**
 * Abused a bit here. Taken from shopify app and modified
 * Effects in a <Suspense> boundary don't run until the suspense is resolved, this is a workaround for when that's needed.
 * Call this inside the suspense boundary
 * See https://discord.com/channels/722131463138705510/751355413701591120/1174676013410697219
 * @param ownerOutsideSuspense An owner to pass in that's from outside the suspense boundary
 * @param functionSettingUpEffects The function that sets up the effects
 */
function runEffectsInSuspense<T>(ownerOutsideSuspense: Owner, functionSettingUpEffects: () => T) {
  let disposeCreatedRoot: VoidFunction;
  const returnValue = runWithOwner(ownerOutsideSuspense, () =>
    createRoot(dispose => {
      disposeCreatedRoot = dispose;
      return functionSettingUpEffects();
    })
  );
  onCleanup(disposeCreatedRoot!);
  return returnValue;
}
