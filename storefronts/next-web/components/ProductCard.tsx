// @ts-nocheck
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { NewStrongerDisplay } from "../from-depict/SearchDisplay";
import { TextPlaceholder } from "@depict-ai/react-ui/latest";

interface ProductCardTitleProps {
  title?: string;
}
const ProductCardTitle: React.FC<ProductCardTitleProps> = ({ title }) => {
  return <h2>{title || <TextPlaceholder width="100%" height="1.5rem" />}</h2>;
};

interface ProductCardPriceProps {
  price?: number;
}
const ProductCardPrice: React.FC<ProductCardPriceProps> = ({ price }) => {
  if (!price)
    return (
      <p>
        <TextPlaceholder width="8ch" height="1em" />
      </p>
    );

  return <p>{price} kr</p>;
};

export function ProductCard({ display: raw_display }: { display?: NewStrongerDisplay | null }) {
  const [hovering, setHovering] = useState(false);
  const display = raw_display?.variant_displays[raw_display?.variant_index] as NewStrongerDisplay | null;

  const isClient = typeof window !== "undefined";
  const router = isClient ? useRouter() : undefined;

  const initialMarket = (router && router.query.market) || "se";
  const [market, setMarket] = useState(initialMarket);

  useEffect(() => {
    if (router && router.isReady) {  // Make sure the router is ready and exists
      const { market: currentMarket } = router.query;
      setMarket(currentMarket || "se");
    }
  }, [router]);

  return (
    <Link href={`/${market}/product`}>
      <style>{cardStyling}</style>
      <div className="container">
        {!display ? (
          <TextPlaceholder width="100%" height="150px" />
        ) : (
          <img
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className="image"
            src={
              hovering && (display as any)?.hover_image_url
                ? (display as any)?.hover_image_url
                : display?.image_urls[0]
            }
          />
        )}
        <div>
          <ProductCardTitle title={display?.title} />
          <ProductCardPrice price={display?.sale_price} />
        </div>
      </div>
    </Link>
  );
}

const cardStyling = `
            .container {
                height: 275px;
                box-shadow: 0px 0px 2px 1px white;
                padding: 5px;
            }
            
            .image {
                width: 100%;
                height: 150px;
                background-color: lightgrey;
            }
        `;
