import { use_element } from "../jsx-runtime";

export const RecommendationContainer = (title?: string | HTMLElement, surface_classes: string[] = []) =>
  use_element(
    e => e.classList.add(...surface_classes),
    (
      <div class="depict recommendation_container">
        {title && typeof title === "string" ? <h4 class="recs_header">{title}</h4> : title}
        <div class="grid"></div>
      </div>
    ) as HTMLDivElement
  );
