import {
  fetchDepictRecommendations,
  RecommendationSlider,
  RecommendationGrid,
  onExistsObserver,
  LooksSliderOrGrid,
} from "@depict-ai/js-ui";
import { merchant, market, backendLocale } from "./main";
import { StrongerDisplay } from "./display";
import { productCard } from "./productCard";

export default function setupRecommendations() {
  onExistsObserver("#related-recommendations", element => {
    // In practice they would already have this ID from a more solid source
    const productId = new URL(location.href).searchParams.get("product-id")!;

    const recommendations = fetchDepictRecommendations<StrongerDisplay>({
      merchant,
      market,
      productIds: [productId],
      sessionId: "vanilla-js-session-1234",
      type: merchant == "equestrian" ? "related" : "product_normal",
      locale: backendLocale,
    });

    const recommendationSlider = RecommendationSlider({
      recommendations,
      productCard,
    });

    element.appendChild(recommendationSlider);

    const recommendationGrid = RecommendationGrid({
      recommendations,
      productCard,
      viewMoreButton: {
        text: "View more",
      },
    });

    // SDK bug!!
    element.appendChild(recommendationGrid);
  });

  onExistsObserver(".replace-with-looks", element => {
    const looksDiv = LooksSliderOrGrid({
      merchant: "hope",
      market: "ag",
      backendLocale: "en",
      productId: "46474080649545",
      priceFormatting: {
        pre_: "$",
        post_: "",
        thousands_delimiter_: ",",
        decimal_places_delimiter_: ".",
        places_after_comma_: 2,
      },
    });
    element.append(looksDiv);
  });
}
