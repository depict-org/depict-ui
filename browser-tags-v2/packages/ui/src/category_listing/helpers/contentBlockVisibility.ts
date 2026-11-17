/** Shopify Lite's storefront (theme-static depict-content-blocks.js) treats screens up to 990px wide as phones. */
export const PHONE_MEDIA_QUERY = "(max-width: 990px)";

/** A listing content block with `visibility` shows on that device class only; absent or unknown shows it everywhere. */
export function isContentBlockShownOnDevice(visibility: unknown, isPhone: boolean) {
  if (visibility === "desktop") return !isPhone;
  if (visibility === "mobile") return isPhone;
  return true;
}
