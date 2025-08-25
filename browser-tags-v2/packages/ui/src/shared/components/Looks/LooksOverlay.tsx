import { catchify, ModernDisplay } from "@depict-ai/utilishared";
import { Accessor, createEffect, createSignal, Index, JSX, onCleanup, Show, Signal } from "solid-js";
import { ListingProvider } from "../../helper_functions/ListingContext";
import { LookItem } from "./LookItem";
import { isAffectedByChromeBug326498383 } from "../../helper_functions/IsAffectedByChromeBug326498383";
import { plp_shared_i18n } from "../../../locales";
import { PseudoRouter } from "../../helper_functions/pseudo_router";
import { useMobileHover } from "../../helper_functions/useMobileHover";

/**
 * The overlay on a look card showcasing the individual items that make up the look
 */
export function LooksOverlay({
  displays_,
  FavoriteButton_,
  userWantsExpandedSignal_,
  containerWidth_,
  animationDuration_,
  supportsHover_,
  priceFormatting_,
  pseudoRouter_,
  containerHeight_,
}: {
  displays_: Accessor<ModernDisplay[] | undefined>;
  FavoriteButton_?: (props: { display_: Accessor<ModernDisplay | null | undefined> }) => JSX.Element;
  userWantsExpandedSignal_: Signal<boolean>;
  containerWidth_: Accessor<number | undefined>;
  containerHeight_: Accessor<number | undefined>;
  animationDuration_: number;
  supportsHover_: Accessor<boolean>;
  priceFormatting_: Accessor<plp_shared_i18n["price_formatting_"]>;
  pseudoRouter_: PseudoRouter;
}) {
  let isAffectedByChromeBug = false;
  // If the user requests the drawer to be expanded or not
  // ResizeObserver value containing the height of the first look item
  const [lookItemHeight, setLookItemHeight] = createSignal(0);
  // The following three signals just contain the state if the animations are actually running and should only be set by the respective animation code
  const textFadeInAnimationRunning = createSignal(false);
  const [getSecondPartAnimationRunning] = textFadeInAnimationRunning;
  const [userWantsExpanded, setUserWantsExpanded] = userWantsExpandedSignal_;
  //const elementsHovered = useMobileHover();

  isAffectedByChromeBug326498383().then(is => (isAffectedByChromeBug = is));

  return (
    // We need a unique ListingProvider for everything that has its own expanded/collapsed, because the image sizes are unique depending on the state
    <ListingProvider>
      {/* We can only show once we have the container width, if we had a fallback value the time before the resizeobserver has reported the correct size being different from the fallback value would start an animation and then our items would be animated weirdly when loading the page */}
      <Show when={containerWidth_() || !displays_()}>
        <div class="scroll-padding">
          <div
            ref={el => {
              createEffect(() => {
                if (userWantsExpanded()) return;
                if (isAffectedByChromeBug) {
                  scrollingFunctionForChrome(el, 0, animationDuration_);
                  return;
                }
                el.scrollTo({ top: 0, behavior: "smooth" });
              });
              // createEffect(wasOpenedByHover => {
              //   if (supportsHover_()) return;
              //   const hovered = elementsHovered();
              //   checkHovered: {
              //     if (hovered.has(el)) break checkHovered;
              //     for (const element of hovered) {
              //       if (el.contains(element)) break checkHovered;
              //     }
              //     if (wasOpenedByHover) setUserWantsExpanded(false);
              //     return;
              //   }
              //   setUserWantsExpanded(true);
              //   return true;
              // });
            }}
            class="look-overlay"
            classList={{
              expanded: userWantsExpanded(),
              "resting-fully-expanded": !getSecondPartAnimationRunning() && userWantsExpanded(),
            }}
            onMouseEnter={catchify(() => displays_()?.length && supportsHover_() && setUserWantsExpanded(true))}
            onMouseLeave={catchify(() => supportsHover_() && setUserWantsExpanded(false))}
            style={
              displays_() && // The styling is written like this to eke out animation smoothness on low CPU devices, git blame for previous, more readable versions.
              `--look-card-width:${containerWidth_()!}px;--look-card-height:${containerHeight_()}px;--look-item-height:${
                lookItemHeight() || 200
              }px`
            }
          >
            {/* Not keying properly because the displays by card can't change rn. If implementing that, key by product_id (loop over an array of those) */}
            <Index each={displays_() || Array.from({ length: 4 })}>
              {(display, index) => {
                return (
                  <LookItem
                    pseudoRouter_={pseudoRouter_}
                    animationDuration_={animationDuration_}
                    display_={display as Accessor<ModernDisplay | null | undefined>}
                    FavoriteButton_={FavoriteButton_}
                    userWantsExpandedSignal_={userWantsExpandedSignal_}
                    textFadeInAnimationRunning_={textFadeInAnimationRunning}
                    priceFormatting_={priceFormatting_}
                    outerRef_={el =>
                      createEffect(() => {
                        if (index !== 0) return;
                        const resizeObserver = new ResizeObserver(
                          catchify(records => setLookItemHeight(records.at(-1)!.contentRect.height))
                        );
                        resizeObserver.observe(el);
                        onCleanup(() => resizeObserver.disconnect());
                      })
                    }
                  />
                );
              }}
            </Index>
          </div>
        </div>
      </Show>
    </ListingProvider>
  );
}

/**
 * Workaround for Chrome bug 326498383, adapted version of https://stackoverflow.com/a/39494245
 */
function scrollingFunctionForChrome(element: Element, targetScrollY: number, duration: number) {
  let start: number | undefined;
  const startingY = element.scrollTop;
  const diff = targetScrollY - startingY;
  const step = catchify((timestamp: number) => {
    if (!start) start = timestamp;
    // Elapsed milliseconds since start of scrolling.
    const time = timestamp - start;
    // Get percent of completion in range [0, 1].
    const percent = Math.min(time / duration, 1);

    element.scrollTo(0, startingY + diff * percent);

    // Proceed with animation as long as we wanted it to.
    if (time < duration) {
      requestAnimationFrame(step);
    }
  });

  // Bootstrap our animation - it will get called right before next frame shall be rendered.
  requestAnimationFrame(step);
}
