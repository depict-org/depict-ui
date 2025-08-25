import { catchify, Display, LegacyDisplay } from "@depict-ai/utilishared/latest";
import {
  ImagePlaceholder,
  media_query_to_accessor,
  ModernResponsiveContainedImage,
  SDKRenderingInfo,
  SolidFormatPrice,
  TextPlaceholder,
} from "@depict-ai/ui/latest";
import { Accessor, createMemo, Show } from "solid-js";
import { A } from "@solidjs/router";
import { cart_param_name } from "~/helpers/query_params";
import { get_instant_current_url_as_object } from "~/helpers/get_instant_current_url_as_object";
import { use_set_search_param } from "~/helpers/set_search_param";
import { maybe_get_color_options } from "~/helpers/maybe_get_color_options";

export const img_aspect_ratio = 300 / 450;

export function ProductCard({
  raw_display,
  info,
  localization,
  is_actually_routing,
}: {
  raw_display: null | Display;
  info?: SDKRenderingInfo;
  is_actually_routing: Accessor<boolean>;
  localization: Accessor<{
    price_formatting_: {
      pre_: string;
      post_: string;
      decimal_places_delimiter_: string;
      thousands_delimiter_: string;
      places_after_comma_: number | "auto";
    };
  }>;
}) {
  const display =
    raw_display && "variant_index" in raw_display
      ? (raw_display.variant_displays[raw_display.variant_index] as LegacyDisplay)
      : raw_display;

  const is_sale = display?.original_price !== display?.sale_price;
  const image_url = display && ((display.image_urls?.[0] as string) || display.image_url || display.display_image_url);
  const price_formatting = createMemo(() => localization().price_formatting_);
  const pre = createMemo(() => price_formatting().pre_);
  const post = createMemo(() => price_formatting().post_);
  const current_location = get_instant_current_url_as_object();
  const cart_contents_string = createMemo(() => current_location().searchParams.get(cart_param_name) || "[]");
  const cart_contents = createMemo(() => JSON.parse(cart_contents_string()));
  const id_for_cart = display?.product_id;
  const is_in_cart = createMemo(() => cart_contents().includes(id_for_cart));
  const is_darkmode = media_query_to_accessor("(prefers-color-scheme: dark)");
  const logic = raw_display?.logic;
  const set_search_param = use_set_search_param(is_actually_routing);
  const color_hex_map = maybe_get_color_options(raw_display);

  return [
    <A
      href={display?.page_url || "javascript:void(0)"}
      class="rec_outer"
      {...(logic
        ? {
            title: "Logic: " + logic,
            style: {
              background: `hsl(${hash_characters(logic) % 360},100%,${is_darkmode() ? "25" : "75"}%)`,
            },
          }
        : { title: JSON.stringify(display, null, 2) })}
    >
      <Show
        when={!display || image_url}
        fallback={
          <>
            Insufficient display data.
            <br />
            <code style={{ "white-space": "pre", overflow: "auto" }}>{JSON.stringify(display, null, 2)}</code>
          </>
        }
      >
        {!display ? (
          <ImagePlaceholder aspectRatio={img_aspect_ratio} />
        ) : (
          <ModernResponsiveContainedImage src={image_url} aspectRatio={img_aspect_ratio} autoAdjustAspectRatio={true} />
        )}
        <Show when={color_hex_map && Object.keys(color_hex_map).length > 1}>
          <div class="color_container">
            {Object.entries(color_hex_map).map(([color, hex]) => (
              <div
                class="color"
                style={{ background: hex, width: "50px", height: "50px" }}
                title={`${color}: ${hex}`}
              />
            ))}
          </div>
        </Show>
        <div class="text_container">
          <div class="rec_title">{!display ? <TextPlaceholder height="1em" width="20ch" /> : display.title}</div>
          <div class="price-container">
            <span class="price">
              {display ? (
                <>
                  {pre()}
                  <SolidFormatPrice price_={display.sale_price} price_formatting_={localization().price_formatting_} />
                  {post()}
                </>
              ) : (
                <TextPlaceholder height="1em" width="5ch" />
              )}
            </span>
            {is_sale && [
              " ",
              <span class="original price">
                {display ? (
                  <>
                    {pre()}
                    <SolidFormatPrice
                      price_={display.original_price}
                      price_formatting_={localization().price_formatting_}
                    />
                    {post()}
                  </>
                ) : (
                  <TextPlaceholder height="1em" width="6ch" />
                )}
              </span>,
            ]}
          </div>
          <div class="buttons">
            <Show when={display?.original_page_url}>
              <button
                type="button"
                class="minor"
                onClick={catchify(e => {
                  // For old customers that still have page_url in the displays, possibly noone
                  e.preventDefault();
                  const link = (
                    <a href={display?.original_page_url} target="_blank" rel="noopener noreferrer" />
                  ) as HTMLAnchorElement;
                  document.body.append(link);
                  link.click();
                  link.remove();
                })}
              >
                Open PDP
              </button>
            </Show>{" "}
            <button
              type="button"
              class="major"
              onClick={catchify(e => {
                e.preventDefault();
                const new_cart = [...cart_contents()];
                if (is_in_cart()) {
                  new_cart.splice(new_cart.indexOf(id_for_cart), 1);
                } else {
                  new_cart.push(id_for_cart);
                }
                set_search_param(cart_param_name, JSON.stringify(new_cart));
              })}
            >
              {is_in_cart() ? "Remove from cart" : "Add to cart"}
            </button>
          </div>
        </div>
      </Show>
    </A>,
  ];
}

// calc a hash for given string
const hash_characters = (str = "") => {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
};
