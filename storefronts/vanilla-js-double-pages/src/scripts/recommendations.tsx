import {
  fetchDepictRecommendations,
  RecommendationSlider,
  RecommendationGrid,
  onExistsObserver,
} from "@depict-ai/js-ui";
import { merchant, market } from "./main";
import { StrongerDisplay } from "./display";
import { productCard } from "./productCard";

export default function setupRecommendations() {
  onExistsObserver("#related-recommendations", element => {
    // In practice they would already have this ID from a more solid source
    const productId = new URL(location.href).searchParams.get("product-id")!;

    const recommendations = fetchDepictRecommendations<StrongerDisplay>({
      merchant,
      market,
      productId,
      userId: "vanilla-js-user-1234",
      sessionId: "vanilla-js-session-1234",
      type: merchant == "equestrian" ? "related" : "product_normal",
    });

    const recommendationSlider = RecommendationSlider({
      recommendations,
      productCard,
    });

    // Todo: Get rid of this when RecommendationSlider becomes sync
    recommendationSlider.then(slider => element.appendChild(slider));

    const recommendationGrid = RecommendationGrid({
      recommendations,
      productCard,
    });

    // Todo: Get rid of this when RecommendationGrid becomes sync
    recommendationGrid.then(grid => element.appendChild(grid));
  });
}
