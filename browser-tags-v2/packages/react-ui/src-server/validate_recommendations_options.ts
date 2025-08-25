// Triggered by synsam trying to put null here and typescript somehow not complaining

import { Display, dwarn } from "@depict-ai/utilishared";

export function validate_recommendations_options(props: { recommendations: Promise<Display[]> }) {
  const us = "RecommendationSlider/RecommendationGrid:";
  if (typeof props?.recommendations?.then !== "function") {
    dwarn(us, "Got", props.recommendations, "which is not thenable");
    throw new Error(
      us +
        " props.recommendations needs to be a promise that is either unresolved (`new Promise(() => {})`) so we can show placeholders, or resolved (`Promise.resolve(recommendation_array)`) to the recommendations to show"
    );
  }
}
