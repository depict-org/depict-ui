import { Accessor, createMemo, createResource, For, JSX, Suspense } from "solid-js";
import {
  Display,
  dwarn,
  fetch_retry,
  make_random_classname,
  n_col_styling_with_dist,
} from "@depict-ai/utilishared/latest";
import { get_base_url } from "~/components/Header";
import { get_market, get_merchant } from "~/helpers/url_state";
import { convert_sdk_cols_at_size_to_layout, DepictSearch, disable_scrolling } from "@depict-ai/ui/latest";
import { ProductCard } from "~/components/ProductCard";
import { cols_at_size } from "~/helpers/global_values";
import { useGap } from "~/helpers/GapProvider";

const display_cache = /*@__PURE__*/ new Map<string, Display>();

export function Cart({
  depict_search,
  cart_ids,
  is_actually_routing,
}: {
  depict_search: DepictSearch<any>;
  cart_ids: Accessor<string[]>;
  is_actually_routing: Accessor<boolean>;
}) {
  disable_scrolling();
  const spacing = useGap();
  const displays = get_displays(cart_ids);
  const container_class = make_random_classname();
  const selector_beginning = `.depict .${container_class}>`;
  const layout_cols_at_size = convert_sdk_cols_at_size_to_layout(cols_at_size);

  const col_styling = createMemo(() => {
    // responsive cols_at_size so that the cart doesn't have a bunch of unused space
    const modified_cols_at_size = layout_cols_at_size.map(row => {
      const [cols, ...rest] = row;
      if (cols > cart_ids().length) {
        return [cart_ids().length, ...rest] as const;
      }
      return row;
    });
    return n_col_styling_with_dist(selector_beginning, spacing(), modified_cols_at_size, "grid");
  });
  let products_element: HTMLDivElement;

  return (
    <div class="products depict plp" ref={products_element!} classList={{ [container_class]: true }}>
      <Suspense fallback="Loading displays…">
        <For each={cart_ids()}>
          {product_id => {
            const display = createMemo(() => displays()?.get(product_id));
            return createMemo(() =>
              ProductCard({
                raw_display: display() as Display | null,
                info: undefined,
                is_actually_routing,
                localization: () => depict_search.localization,
              })
            ) as unknown as JSX.Element;
          }}
        </For>
      </Suspense>
      <style>{col_styling()}</style>
    </div>
  );
}

export function get_displays(product_ids: Accessor<string[]>) {
  const [resource] = createResource(
    createMemo(() => [product_ids(), get_merchant(), get_market()] as const),
    async ([cart_ids, merchant, market]) => {
      const output_displays = new Map<string, Display>();
      const to_request: string[] = [];

      for (let i = 0; i < cart_ids.length; i++) {
        const id = cart_ids[i];
        const display = display_cache.get(`${merchant}-${market}-${id}`);
        if (display) {
          output_displays.set(get_product_id_of_display(display), display);
        } else {
          to_request.push(id);
        }
      }

      const response =
        to_request.length &&
        (await fetch_retry(`${get_base_url()}/get-displays`, {
          method: "POST",
          body: JSON.stringify({
            tenant: merchant,
            market: market,
            product_ids: to_request,
          }),
        }));

      if (response) {
        const decoded = await response.json();
        const new_displays = decoded.displays as Display[] | undefined;
        if (new_displays) {
          for (let i = 0; i < new_displays.length; i++) {
            const display = new_displays[i];
            const product_id = get_product_id_of_display(display);
            display_cache.set(`${merchant}-${market}-${product_id}`, display);
            output_displays.set(product_id, display);
          }
        } else {
          dwarn("No displays returned from server", new_displays);
        }
      }
      return output_displays;
    }
  );

  return resource;
}

function get_product_id_of_display(display: Display) {
  if ("variant_index" in display) {
    return display.variant_displays[display.variant_index].product_id;
  }
  return display.product_id;
}
