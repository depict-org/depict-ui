/** @jsxImportSource solid-js */
import { createMemo, createResource, Show, Suspense } from "solid-js";
import { ImagePlaceholder } from "../Placeholders/ImagePlaceholder";
import { GetDisplaysRequestV3 } from "@depict-ai/types/api/GetDisplaysRequestV3";
import { add_version_query_params, base_url, ContainedImage, ModernDisplay } from "@depict-ai/utilishared";

export function ShopTheLookImage(props: {
  merchant_: string;
  market_: string;
  locale_: string;
  imageAspectRatio_: number;
  productId_: string;
}) {
  const [display] = createResource(
    () => ({
      merchant: props.merchant_,
      market: props.market_,
      locale: props.locale_,
      product_ids: [props.productId_] as [string],
    }),
    async (request: GetDisplaysRequestV3) => {
      const response = await fetch(add_version_query_params(`${base_url}/v3/get-displays`), {
        method: "POST",
        body: JSON.stringify(request),
      });
      const decoded = await response.json();
      return decoded.displays[0] as ModernDisplay;
    }
  );
  const placeholder = <ImagePlaceholder aspectRatio={props.imageAspectRatio_} />;

  return (
    <div class="image-container">
      <Suspense fallback={placeholder}>
        {(() => {
          const imageUrl = createMemo(() => {
            const d = display();
            const variant = d?.variant_displays[d?.variant_index];
            return variant?.image_urls?.[0] || (variant?.display_image_url as string | undefined);
          });

          return (
            <Show when={imageUrl()} fallback="Cannot load image">
              <ContainedImage
                loading="lazy"
                srcset_opts={{ set_dataset: false }}
                src={imageUrl()}
                aspect_ratio={props.imageAspectRatio_}
                rendering_options={{}}
                alt="Product image showing the current product with other outfits highlighted on the model"
              />
            </Show>
          );
        })()}
      </Suspense>
    </div>
  );
}
