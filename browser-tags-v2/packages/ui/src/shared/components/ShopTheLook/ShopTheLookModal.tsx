/** @jsxImportSource solid-js */
import { OnNavigation, PseudoRouter } from "../../helper_functions/pseudo_router";
import { ProductCardTemplate } from "../../types";
import { getOwner, onCleanup, Resource } from "solid-js";
import { disable_scrolling } from "../../../search/helper_functions/disable_scrolling";
import { SentryErrorBoundary } from "../SentryErrorBoundary";
import { CrossIcon } from "../icons/CrossIcon";
import { catchify, Display, observer } from "@depict-ai/utilishared";
import { ShopTheLookImage } from "./ShopTheLookImage";
import { TabbedProducts } from "./TabbedProducts";

export type ShopTheLookOpenModalOptions<T extends Display> = {
  onNavigation: OnNavigation;
  productId: string;
  merchant: string;
  market: string;
  locale: string;
  imageAspectRatio: number;
  productCardTemplate: ProductCardTemplate<T>;
};

export type InternalShopTheLookOpenModalOptions<T extends Display> = ShopTheLookOpenModalOptions<T> & {
  products_to_shop_: Resource<{ shop_the_look: Record<string, T[]> }>;
};

export function ShopTheLookModal(
  props: InternalShopTheLookOpenModalOptions<any> & {
    actually_close_modal_: VoidFunction;
    register_closing_animation_: (animation: () => Promise<any>) => void;
  }
) {
  const pseudo_router_ = new PseudoRouter(props.onNavigation);
  const closing_animations: (() => Animation)[] = [];
  const owner = getOwner()!;
  const isBig = () => matchMedia("(min-height: 740px) and (min-width: 740px)").matches;
  props.register_closing_animation_(() => Promise.all(closing_animations.map(animation => animation().finished)));
  disable_scrolling();

  return [
    (
      <div id="depict-shop-the-look-modal" class="depict shop-the-look">
        <div
          class="shop-the-look-backdrop"
          onClick={props.actually_close_modal_}
          ref={catchify(element => {
            const disconnect = observer.onexists<HTMLDivElement>(element, ({ element }) => {
              const animation = element.animate(
                { opacity: [0, 1], backdropFilter: ["blur(0)", "blur(3px)"] },
                { duration: 150, fill: "forwards", easing: "ease-in-out" }
              );
              closing_animations.push(() => (animation.reverse(), animation));
            });
            onCleanup(disconnect);
          })}
        />
        <div
          class="modal-contents"
          ref={element => {
            const disconnect = observer.onexists<HTMLDivElement>(element, ({ element }) =>
              element.animate(
                {
                  opacity: [0, 1],
                  transform: isBig()
                    ? ["translate(-50%,-150%)", "translate(-50%,-50%)"]
                    : ["translate(-50%,80%)", "translate(-50%,0%)"],
                },
                { duration: 250, easing: "ease-in" }
              )
            );
            closing_animations.push(() =>
              element.animate(
                {
                  opacity: [1, 0],
                  transform: isBig()
                    ? ["translate(-50%,-50%)", "translate(-50%,-150%)"]
                    : ["translate(-50%,0%)", "translate(-50%,80%)"],
                },
                { duration: 150, easing: "ease-out" }
              )
            );
            onCleanup(disconnect);
          }}
        >
          <SentryErrorBoundary message_="ShopTheLookModal failed" severity_="error">
            <div class="top-bar">
              <button class="close" onClick={props.actually_close_modal_}>
                <CrossIcon width={16} height={16} />
              </button>
            </div>
            <div class="below-top-bar">
              <h2>Outfit recommendations</h2>
              <div class="image-and-suggestions">
                <ShopTheLookImage
                  locale_={props.locale}
                  market_={props.market}
                  merchant_={props.merchant}
                  imageAspectRatio_={props.imageAspectRatio}
                  productId_={props.productId}
                />
                <div class="tabs">
                  <TabbedProducts
                    modalOwner_={owner}
                    pseudo_router_={pseudo_router_}
                    productCardTemplate_={props.productCardTemplate}
                    products_to_shop_={props.products_to_shop_}
                    actually_close_modal_={props.actually_close_modal_}
                  />
                </div>
              </div>
            </div>
          </SentryErrorBoundary>
        </div>
      </div>
    ) as HTMLDivElement,
  ];
}
