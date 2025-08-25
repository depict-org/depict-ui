import { TextPlaceholder, ImagePlaceholder } from "@depict-ai/js-ui";
import { StrongerDisplay, EquestrianDisplay } from "./display";

const equestrian_aspect_ratio = 3 / 4;
const stronger_aspect_ratio = 2 / 3;

// the configuration (see jsx.d.ts and babel.config.json) and jsx-runtime allows us to use JSX to create normal DOM nodes
// this is faster than parsing HTML strings and makes it much easier to template things
// It also allows creating components nicely and makes it easy to use observers and add event listeners to the created nodes (you can just save them in a variable and then add stuff to them, or use use_element or use_listener)
export function productCard(display: StrongerDisplay | EquestrianDisplay | null) {
  const variant =
    display && "variant_index" in display ? display.variant_displays[display.variant_index] : display ? display : null;
  const image_url = (variant && "image_url" in variant ? variant.image_url : variant?.image_urls[0]) as string;

  return (
    <div class="product-card">
      <a href={`/pdp.html?product-id=${variant?.product_id}`}>
        {image_url ? (
          <div style={`position:relative;width:100%;padding-bottom:${(1 / equestrian_aspect_ratio) * 100}%`}>
            <img src={image_url} alt="" class="product-img depict-img-mod" loading="lazy" />
          </div>
        ) : (
          <ImagePlaceholder aspectRatio={equestrian_aspect_ratio} />
        )}
        <span class="text-container">
          <span class="title">{variant?.title || <TextPlaceholder height="1em" width="20ch" />}</span>
          <span class="price">{variant ? variant.sale_price : <TextPlaceholder height="1em" width="4ch" />}</span>
        </span>
      </a>
    </div>
  );
}
