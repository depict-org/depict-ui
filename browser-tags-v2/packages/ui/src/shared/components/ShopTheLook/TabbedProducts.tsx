/** @jsxImportSource solid-js */
import { PseudoRouter } from "../../helper_functions/pseudo_router";
import {
  createEffect,
  createMemo,
  For,
  getOwner,
  Index,
  JSX,
  on,
  onCleanup,
  Owner,
  Resource,
  runWithOwner,
  Show,
  Suspense,
} from "solid-js";
import { ProductCardTemplate } from "../../types";
import { defaultGridSpacing } from "../../../sdks/shared_defaults";
import { SDKColsAtSize } from "../../helper_functions/cols_at_size_transformer/cols_at_size_transformer";
import { Tab, Tabs } from "../Tabs";
import { TextPlaceholder } from "../Placeholders/TextPlaceholder";
import { SDKRecommendationGrid } from "../../../sdks/recommendation_grid";
import { catchify, ModernDisplay, use_href_accessor } from "@depict-ai/utilishared";
import { unwrap_solid_jsx_element } from "../../helper_functions/unwrap_solid_jsx_element";

export function TabbedProducts<T extends ModernDisplay>(props: {
  pseudo_router_: PseudoRouter;
  productCardTemplate_: ProductCardTemplate<T>;
  products_to_shop_: Resource<{ shop_the_look: Record<string, T[]> }>;
  actually_close_modal_: VoidFunction;
  /**
   * Owner of the whole modal that gets disposed when the modal closes
   */
  modalOwner_: Owner;
}) {
  const gridSpacing = defaultGridSpacing;
  const columnsAtSize = [[3], [2, 901]] as SDKColsAtSize;
  const href = use_href_accessor();
  const hrefWithoutHash = createMemo(() => {
    // Don't let the hash count for knowing when the user navigated away as we change the hash when different tabs are selected
    const url = new URL(href());
    url.hash = "";
    return "" + url;
  });
  const makeJSXElementCloseModalWhenClicked = (returnValue: JSX.Element) => {
    const resolved = unwrap_solid_jsx_element(() => returnValue);
    createEffect(() => {
      // If someone clicks on a product card in the shop the look modal, close the modal the next time the href changes
      for (const item of resolved()) {
        if (!(item instanceof Element)) return;
        item.addEventListener(
          "click",
          catchify(() =>
            // run with modal owner so we don't do stuff after the modal closes
            // can't have the owner of the product card as that gets disposed if the productId changes which might be too early (before location.href has changed)
            runWithOwner(props.modalOwner_, () =>
              createEffect(on(hrefWithoutHash, props.actually_close_modal_, { defer: true }))
            )
          ),
          { capture: true }
        );
      }
    });
    return resolved as unknown as JSX.Element;
  };

  return (
    <Show when={!props.products_to_shop_.error} fallback={"Failed fetching shop by look recommendations"}>
      <Tabs
        AnchorComponent={anchorProps => (
          <a
            onClick={e => {
              const { href } = anchorProps;
              if (!href) return;
              props.pseudo_router_.navigate_.go_to_({
                scroll: false,
                is_replace_: false,
                new_url_: new URL(href),
                event_: e,
              });
            }}
            {...anchorProps}
          >
            {anchorProps.children}
          </a>
        )}
      >
        <Suspense
          fallback={
            <>
              <Index each={Array.from({ length: 2 })}>
                {() => (
                  <Tab label={<TextPlaceholder height="1em" width="10ch" />}>
                    <SDKRecommendationGrid
                      grid_spacing={gridSpacing}
                      cols_at_size={columnsAtSize}
                      recommendations={new Promise<T[]>(r => onCleanup(() => r([])))}
                      product_card_template={props.productCardTemplate_}
                      max_rows={2}
                    />
                  </Tab>
                )}
              </Index>
            </>
          }
        >
          {(() => {
            const groups = createMemo(() => Object.keys(props.products_to_shop_()?.shop_the_look || {}));
            return (
              <For each={groups()}>
                {group => (
                  <Tab label={group} id={"shop-the-look-" + group.replaceAll(" ", "-").toLowerCase()}>
                    <SDKRecommendationGrid
                      grid_spacing={gridSpacing}
                      cols_at_size={columnsAtSize}
                      recommendations={Promise.resolve(props.products_to_shop_()!.shop_the_look[group]!)}
                      product_card_template={(...args) => {
                        const returnValue = props.productCardTemplate_(...args);
                        // Product card template can return promise, handle that
                        if (typeof returnValue === "object" && returnValue && "then" in returnValue) {
                          const owner = getOwner()!;
                          return returnValue.then(returnValue =>
                            runWithOwner(owner, () => makeJSXElementCloseModalWhenClicked(returnValue))
                          );
                        }
                        return makeJSXElementCloseModalWhenClicked(returnValue);
                      }}
                    />
                  </Tab>
                )}
              </For>
            );
          })()}
        </Suspense>
      </Tabs>
    </Show>
  );
}
