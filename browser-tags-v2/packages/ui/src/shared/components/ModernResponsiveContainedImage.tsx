import { ShopifyContainedImage } from "./shopify/ShopifyContainedImage";
import { generateShopifyImageUrl, ShopifyResponsiveImg } from "./shopify/ResponsiveImg";

const customUrls = (
  url: string,
  width: number // Apparently don't have to encode url for CF's service
) => {
  if (url?.startsWith?.("https://cdn.shopify.com")) {
    // The shopify image resizing CDN blocks Cloudflare's image resizer. It's possible that we can't detect shopify image URLs sometimes because they go to the merchant's domain,
    // but it seems like the URLs returned by the Depict API always goes to the cdn.shopify.com version of an image, so this simple workaround works.
    return generateShopifyImageUrl(url, width);
  }
  // Use cloudflare image resizer instead of img.depict.ai because it's a lot faster (and also auto-chooses other formats if webp is not supported)
  return `https://app.depict.ai/cdn-cgi/image/width=${width},format=auto/${url}`;
};

/**
 * Hacks ShopifyContainedImage work even for non-shopify image urls by forcing the format to be WebP
 */
export function ModernResponsiveContainedImage(props: Parameters<typeof ShopifyContainedImage>[0]) {
  return (
    <ShopifyContainedImage
      {...props}
      imgProps={{
        ...props.imgProps,
        customUrls,
      }}
    />
  );
}

/**
 * Wrapper around ShopifyResponsiveImg (component that just does an image, without wrapping in div). The wrapper allows ShopifyResponsiveImg to work both with shopify CDN URLs and arbitrary URLs, where the latter will be fed through Depict's cloudflare resizer.
 */
export function ModernResponsiveImage(props: Parameters<typeof ShopifyResponsiveImg>[0]) {
  return <ShopifyResponsiveImg {...props} customUrls={customUrls} />;
}
