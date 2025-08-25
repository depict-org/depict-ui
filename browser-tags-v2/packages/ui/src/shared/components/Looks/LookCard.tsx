import { catchify, ModernDisplay } from "@depict-ai/utilishared";
import { Accessor, createEffect, createMemo, createSignal, JSX, onCleanup, Show, Signal } from "solid-js";
import { ImagePlaceholder } from "../Placeholders/ImagePlaceholder";
import { media_query_to_accessor } from "../../helper_functions/media_query_to_accessor";
import { LooksOverlay } from "./LooksOverlay";
import { FeaturedInDisplay } from "@depict-ai/types/api/FeaturedInResponseV3";
import { ModernResponsiveContainedImage } from "../ModernResponsiveContainedImage";
import { aspectRatioOverrideCssVariableName } from "../../../search/components/DefaultInstantCardPlaceholder";
import { plp_shared_i18n } from "../../../locales";
import { PseudoRouter } from "../../helper_functions/pseudo_router";
import { useSlidableInformation } from "../SlidableItems";
import { useProductCardIndex } from "../../helper_functions/ProductCardIndexContext";

/**
 * The whole card representing a look
 */
export function LookCard({
  display_,
  expandedLooksSignal_: [expandedLooks_, setExpandedLooks],
  FavoriteButton_,
  placeholderImageAspectRatio_,
  animationDuration_,
  priceFormatting_,
  pseudoRouter_,
}: {
  display_: Accessor<FeaturedInDisplay | null>;
  FavoriteButton_?: (props: { display_: Accessor<ModernDisplay | null | undefined> }) => JSX.Element;
  placeholderImageAspectRatio_: number | string;
  animationDuration_: number;
  expandedLooksSignal_: Signal<Set<symbol>>;
  priceFormatting_: Accessor<plp_shared_i18n["price_formatting_"]>;
  pseudoRouter_: PseudoRouter;
}) {
  let container: HTMLDivElement;
  const useWantsExpandedSignal_ = createSignal(false);
  const [userWantsExpanded, setUserWantsExpanded] = useWantsExpandedSignal_;
  const supportsHover_ = media_query_to_accessor("(hover: hover) and (pointer: fine)");
  const us = Symbol("look");
  const index = useProductCardIndex();
  const [containerWidth_, setContainerWidth] = createSignal<number>();
  const [containerHeight_, setContainerHeight] = createSignal<number>();
  const clickHandler = catchify(({ target }: MouseEvent) => {
    if (target !== container && !container.contains(target as Node)) {
      // When clicking outside the look, close it
      setUserWantsExpanded(false);
    }
  });
  const slidableInformation = useSlidableInformation();

  addEventListener("click", clickHandler);
  onCleanup(() => removeEventListener("click", clickHandler));

  createEffect(() =>
    setExpandedLooks(prev => {
      if (userWantsExpanded()) {
        // Close the other expanded looks
        prev.clear();
        // Add us
        prev.add(us);
      } else {
        prev.delete(us);
      }
      return prev;
    })
  );

  createEffect(() => !display_() && setUserWantsExpanded(false));

  if (slidableInformation) {
    const ourVisiblityInSlider = createMemo(() => {
      const currentCard = index?.();
      if (isNaN(currentCard as number)) return;
      slidableInformation?.intersectionEntries_();
      return slidableInformation?.slider_.intersecting_items_object?.[currentCard as number]?.intersectionRatio;
    });
    createEffect<number | undefined>(prevVisibility => {
      // Have memo -> effect setup for diffing, so we do as little work as possible in unrelated cards
      // as number is safe because undefined and NaN are both not < 0.5
      const visibility = ourVisiblityInSlider() as number;
      if (visibility < 0.9 && (isNaN(prevVisibility as number) || visibility - (prevVisibility as number) < 0)) {
        // When sliding this card completely into the background, collapse it
        // Don't collapse it if we're about to put it more into visibility, to fix what's described at the end of https://www.loom.com/share/8796209c68764b18a0d565010929f594
        setUserWantsExpanded(false);
      }
      return visibility;
    });
  }

  // Close us if another look expands
  createEffect(() => !expandedLooks_().has(us) && setUserWantsExpanded(false));

  return (
    <div
      ref={el => {
        container = el;
        const ro = new ResizeObserver(
          catchify(records => {
            const last = records.at(-1);
            if (!last) return;
            const { width, height } = last.contentRect;
            setContainerWidth(width);
            setContainerHeight(height);
          })
        );
        ro.observe(el);
        onCleanup(() => ro.disconnect());
      }}
      class="look-card"
      classList={{ placeholder: !display_() }}
      onClick={catchify(() => display_() && setUserWantsExpanded(prev => !prev))}
    >
      <Show
        when={display_()}
        fallback={
          <ImagePlaceholder
            aspectRatio={`var(${aspectRatioOverrideCssVariableName}, ${placeholderImageAspectRatio_})`}
          />
        }
      >
        {/* When implementing LLPs, make sure to use fixed size image */}
        <ModernResponsiveContainedImage
          src={display_()?.image_urls?.[0] as string}
          aspectRatio={placeholderImageAspectRatio_}
          autoAdjustAspectRatio={true}
        />
      </Show>
      <LooksOverlay
        displays_={() => display_()?.displays as ModernDisplay[] | undefined}
        userWantsExpandedSignal_={useWantsExpandedSignal_}
        containerWidth_={containerWidth_}
        animationDuration_={animationDuration_}
        supportsHover_={supportsHover_}
        FavoriteButton_={FavoriteButton_}
        priceFormatting_={priceFormatting_}
        pseudoRouter_={pseudoRouter_}
        containerHeight_={containerHeight_}
      />
    </div>
  );
}
