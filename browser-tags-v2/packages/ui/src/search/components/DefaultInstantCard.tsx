/** @jsxImportSource solid-js */
import { catchify } from "@depict-ai/utilishared";
import { Accessor, createMemo, createResource, JSX, Show } from "solid-js";
import { SolidFormatPrice } from "../../shared/helper_functions/solid_format_price";
import { solid_search_i18n } from "../../locales/i18n_types";
import { PseudoRouter } from "../../shared/helper_functions/pseudo_router";
import { SelectedIndexType } from "../helper_functions/keyboard_navigation_types";
import {
  scrollIntoViewIfSelectedByKeyboardNavigation,
  useIsSelected,
} from "../helper_functions/modal_keyboard_navigation_helpers";
import { media_query_to_accessor } from "../../shared/helper_functions/media_query_to_accessor";
import { ModernDisplayWithPageUrl } from "../../shared/display_transformer_types";
import { TextPlaceholder } from "../../shared/components/Placeholders/TextPlaceholder";

export const DefaultInstantCard = ({
  display_,
  router_,
  InstantCardImageComponent_,
  i18n_,
  keyboardNavigationGroupIndex_,
  index_,
  selected_index_,
}: {
  display_: ModernDisplayWithPageUrl<any>;
  i18n_: solid_search_i18n;
  router_: PseudoRouter;
  InstantCardImageComponent_: (props: { src_: string; class_?: string }) => JSX.Element;
  index_: Accessor<number>;
} & (
  | { keyboardNavigationGroupIndex_?: never; selected_index_?: never } // <- ClassicSearchModal
  | { keyboardNavigationGroupIndex_: Accessor<number>; selected_index_: SelectedIndexType }
)) => {
  // <- SearchModalV2
  const [get_selected_index_, set_selected_index_] = selected_index_ || [];
  const variant = display_.variant_displays[display_.variant_index];
  const href = createMemo(() => variant.page_url); // <- could be made reactive getter in displayTransformers, read it in memo here since it might create computations (for example in the preview-brower), and there's no owner in the onClick handler
  // Prices can be promises, for example in our shopify app. Always assume they are (will work the same when they aren't)
  const [salePrice] = createResource(() => variant.sale_price as number | Promise<undefined | number>);
  const [originalPrice] = createResource(() => variant.original_price as number | Promise<undefined | number>);
  const isOnSale = createMemo(() => salePrice() !== originalPrice());

  const supports_hover = media_query_to_accessor("(hover: hover) and (pointer: fine)");

  const [isSelected, selectedDueToKeyboardNavigation] = selected_index_
    ? useIsSelected(get_selected_index_!, keyboardNavigationGroupIndex_, index_)
    : [];

  const secondary_image_url =
    variant.image_urls?.[1] || variant.secondary_image_url || variant.alternative_display_image_url;
  const brandInTagline = (selected_index_ && variant.brand) as string | undefined;
  const TitleBrandTagline = () => (
    <>
      {!selected_index_ && <span class="brand">{variant.brand}</span>}
      <span class="title line-clamp" title={variant.title}>
        {variant.title}
      </span>
      {(variant.sub_heading_1 || variant.sub_heading_2 || brandInTagline) && (
        <div class="tagline line-clamp">
          {[brandInTagline, variant.sub_heading_1, variant.sub_heading_2].filter(v => v).join(" | ")}
        </div>
      )}
    </>
  );

  return (
    <a
      class="instant-card"
      href={href()}
      onClick={catchify(event_ =>
        router_.navigate_.go_to_({
          new_url_: href(),
          is_replace_: false,
          event_,
        })
      )}
      data-search-result-id={display_.search_result_id}
      classList={{ selected: isSelected?.() }}
      aria-selected={isSelected?.()}
      onMouseEnter={catchify(() => set_selected_index_?.([keyboardNavigationGroupIndex_!(), index_()]))}
      onMouseLeave={catchify(() => set_selected_index_?.())}
      ref={element =>
        scrollIntoViewIfSelectedByKeyboardNavigation(element, () => selectedDueToKeyboardNavigation?.() ?? false)
      }
    >
      <div class="img-part">
        <InstantCardImageComponent_ src_={variant.image_urls?.[0] || variant.image_url || variant.display_image_url} />
        {/*Only show hover images in SearchModalV2*/}
        <Show when={selected_index_ && secondary_image_url && supports_hover()}>
          <InstantCardImageComponent_ src_={secondary_image_url} class_="secondary" />
        </Show>
      </div>
      <div class="right-part">
        {selected_index_ ? (
          <TitleBrandTagline />
        ) : (
          <div class="title-brand-tagline">
            <TitleBrandTagline />
          </div>
        )}
        <div class="price-container">
          <Show when={isOnSale()}>
            <span class="orig price">
              {i18n_.price_formatting_().pre_}
              <SolidFormatPrice price_={originalPrice()!} price_formatting_={i18n_.price_formatting_()} />
              {i18n_.price_formatting_().post_}
            </span>
          </Show>
          <Show
            when={!salePrice.loading && salePrice.latest != undefined}
            fallback={
              <>
                <TextPlaceholder width="5ch" height="max(1em, 100%)" class="price" />
                &nbsp;
                {/* The non-breaking space here is intentional to make the placeholder be exactly the height that the text would be. Basically by having it besides the placeholder it makes the parent become as high as default font size (1em) + the current line height. Then setting 100% height (the 1em is fallback) on the placeholder makes it as high as the parent. */}
              </>
            }
          >
            <span class={"price"} classList={{ "sales-price": isOnSale() }}>
              {i18n_.price_formatting_().pre_}
              <SolidFormatPrice price_={salePrice()!} price_formatting_={i18n_.price_formatting_()} />
              {i18n_.price_formatting_().post_}
            </span>
          </Show>
        </div>
      </div>
    </a>
  );
};
