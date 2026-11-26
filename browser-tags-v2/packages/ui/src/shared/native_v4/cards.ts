import type { ModernDisplay } from "@depict-ai/utilishared";
import type { Product } from "./v4_types";

/** Which v3 result id a card's `tracking_id` goes in; the d1 id it carries says the same (`d1.s.…`, `d1.l.…`). */
export type TrackingIdKey = "search_result_id" | "product_listing_result_id" | "recommendation_id";

/** A bare 3/4/6/8-digit hex, as fi stores a computed `color_hex`; v3 serves it with its `#`. */
const BARE_HEX = /^(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * A native V4 card as the v3 display depict-ui and merchant display transformers read: `variant_displays` are the
 * card's variants and `variant_index` its `selected`, and every product-level field is copied into each variant.
 *
 * Mirrors realtime's facade `toV3Display` (`v4/worker/src/facade/v3Display.ts`) for a card without the server-only
 * inputs (the Argo legacy overlay, image choices, the merchant's display allowlist). Two consequences:
 * - The card fields v3 writes only when the merchant's display config lists them (`brand`, `sku`, `slug`, `size_name`
 *   and the image aliases `image_url`, `display_image_url`, `secondary_image_url`, `alternative_display_image_url`)
 *   are left out: the browser can't see that allowlist, most merchants list none of them (and none lists the image
 *   aliases), and the UI shows `brand` when it's there. A merchant whose display lists one loses it on native until
 *   V4 says which card fields the display lists.
 * - Merchant fields come from `attributes`, so request cards with `include=attributes` to get the display ones.
 */
export function native_card_to_display(product: Product, tracking_key: TrackingIdKey): ModernDisplay {
  const product_attributes = product.attributes ?? {};
  return {
    variant_index: product.selected,
    variant_displays: product.variants.map(variant => {
      // A variant carries its own main image only when it differs from the card's; it has no gallery of its own.
      const image_urls = variant.image ? [variant.image] : [...product.images];
      const price = variant.price ?? product.price;
      const color = variant.color ?? product.color;
      const display: Record<string, unknown> = {
        ...product_attributes,
        // The merchant's variant attributes under their own keys (`add_to_cart_id`, `item_group_id`, …); the card
        // fields below win over a same-named attribute, as on v3.
        ...variant.attributes,
        product_id: variant.product_id,
        main_product_id: variant.attributes?.main_product_id ?? variant.group_id ?? product.group_id,
        title: variant.title ?? product.title,
        image_urls,
        sale_price: price.amount,
        original_price: price.compare_at ?? price.amount,
        ...(price.lowest !== undefined ? { lowest_price: price.lowest } : {}),
        in_stock: variant.in_stock,
        ...(color ? { color_name: color.name } : {}),
        uri: variant.slug ?? product.slug,
      };
      const hex = display.color_hex;
      if (typeof hex === "string" && BARE_HEX.test(hex)) display.color_hex = `#${hex}`;
      return display as ModernDisplay["variant_displays"][number];
    }),
    [tracking_key]: product.tracking_id,
  } as ModernDisplay;
}
