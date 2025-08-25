import React from "react";
import { DepictProductCardProps, TextPlaceholder } from "@depict-ai/react-ui";
import { HoudiniDisplay, MayaDelorezDisplay, SpendrupsDisplay } from "./SearchDisplay";
import { Link } from "react-router-dom";

export function ProductCard({ display }: DepictProductCardProps<SpendrupsDisplay | MayaDelorezDisplay>) {
  const variant_display =
    display && "variants" in display ? display.variants.filter(v => v.product_id == display.product_id)[0] : 
    display && "variant_index" in display ? display.variant_displays[display.variant_index] :
    display;

  const image_url = !variant_display ? null : "image_url" in variant_display ? variant_display.image_url: "image_urls" in variant_display ? variant_display.image_urls[0] : null;
  const sale_price = !variant_display ? null : "sale_price" in variant_display ? variant_display.sale_price : "list_price" in variant_display ? variant_display.list_price : null;
  return (
    <div className="product_card">
      <Link to={"/pdp"}>
        <div className="flip-card">
          <div className="flip-card-inner">
            {variant_display && (
              <>
                <div className="flip-card-front">
                  <h1>{variant_display?.title || "Placeholder"}</h1>
                  <img src={image_url || ""} />
                </div>
                <div className="flip-card-back">
                  <h1>{sale_price || "100"} kr</h1>
                  <button>Visit PDP</button>
                </div>
              </>
            )}
            {!variant_display && <TextPlaceholder width="100%" height="100%" />}
          </div>
        </div>
      </Link>
    </div>
  );
}
