import { catchify, ModernDisplay, observer } from "@depict-ai/utilishared";
import {
  Accessor,
  createMemo,
  createRenderEffect,
  createResource,
  createSignal,
  getOwner,
  JSX,
  onCleanup,
  runWithOwner,
  Show,
  Signal,
  untrack,
} from "solid-js";
import { ImagePlaceholder } from "../Placeholders/ImagePlaceholder";
import { aspectRatioOverrideCssVariableName } from "../../../search/components/DefaultInstantCardPlaceholder";
import { ModernResponsiveContainedImage } from "../ModernResponsiveContainedImage";
import { TextPlaceholder } from "../Placeholders/TextPlaceholder";
import { plp_shared_i18n } from "../../../locales";
import { SolidFormatPrice } from "../../helper_functions/solid_format_price";
import { PseudoRouter } from "../../helper_functions/pseudo_router";

/**
 * The "card" for an individual item that makes up a look, has two states depending on if it's expanded or not
 */
export function LookItem({
  display_,
  FavoriteButton_,
  userWantsExpandedSignal_: [userWantsExpanded, setUserWantsExpanded],
  textFadeInAnimationRunning_,
  outerRef_,
  animationDuration_,
  priceFormatting_,
  pseudoRouter_,
}: {
  display_: Accessor<ModernDisplay | null | undefined>;
  FavoriteButton_?: (props: { display_: Accessor<ModernDisplay | null | undefined> }) => JSX.Element;
  userWantsExpandedSignal_: Signal<boolean>;
  textFadeInAnimationRunning_: Signal<boolean>;
  outerRef_?: (el: HTMLAnchorElement) => void;
  animationDuration_: number;
  priceFormatting_: Accessor<plp_shared_i18n["price_formatting_"]>;
  pseudoRouter_: PseudoRouter;
}) {
  const variantToUse = createMemo(() => {
    const display = display_();
    return display?.variant_displays[display?.variant_index] as
      | {
          image_urls: string[];
          title: string;
          sale_price: Promise<number> | number;
          original_price: Promise<number> | number;
          page_url: string;
        }
      | undefined;
  });
  const imageUrl = createMemo(() => variantToUse()?.image_urls?.[0]);
  const [animationIsRunning, setAnimationIsRunning] = textFadeInAnimationRunning_;
  const [isExpandedThrottledByOurEffectRun, setIsExpandedThrottledByOurEffectRun] = createSignal(
    untrack(userWantsExpanded)
  );
  const [animationEffectExists, setAnimationEffectExists] = createSignal(false);
  const [salePrice] = createResource(() => variantToUse()?.sale_price);
  const [originalPrice] = createResource(() => variantToUse()?.original_price);
  const isOnSale = createMemo(
    () => !salePrice.loading && !originalPrice.loading && salePrice.latest !== originalPrice.latest
  ); // .latest doesn't trigger suspense after the initial load
  const enableLink = createMemo(() => userWantsExpanded() && !animationIsRunning());
  const href = createMemo(() => variantToUse()?.page_url);
  const FavoriteButton = FavoriteButton_!; // Just to get rid of the type error - TS doesn't understand <Show>
  const title = createMemo(() => variantToUse()?.title);

  return (
    <a
      class="look-item"
      ref={outerRef_}
      {...(enableLink() ? { href: href() } : {})}
      onClick={catchify(event_ => {
        if (enableLink()) {
          pseudoRouter_.navigate_.go_to_({ new_url_: href()!, is_replace_: false, event_ });
          if (!event_.defaultPrevented) {
            // If the user opened in a new tab, prevent the event from propagating to the parent which would close the look
            event_.stopImmediatePropagation();
          }
        }
      })}
    >
      <Show
        when={imageUrl}
        fallback={<ImagePlaceholder aspectRatio={`var(${aspectRatioOverrideCssVariableName}, 0.75)`} />}
      >
        <div class="img-wrapper">
          <Show when={imageUrl()} fallback={<ImagePlaceholder aspectRatio={1} />}>
            <ModernResponsiveContainedImage
              src={imageUrl()!}
              aspectRatio={userWantsExpanded() ? 0.75 : 1}
              // Need to smooth the aspect ratio because even if it just changes slightly during the transition, the transition will re-start its duration
              autoAdjustAspectRatio={userWantsExpanded()}
              imgProps={{ keyRatioUpdating: true }}
            />
          </Show>
        </div>
      </Show>
      <Show
        when={
          (animationEffectExists() ? isExpandedThrottledByOurEffectRun() : userWantsExpanded()) || animationIsRunning()
        }
      >
        <div
          class="right-part"
          ref={element => {
            const owner = getOwner();

            onCleanup(
              observer.onexists(element, ({ element, disconnector }) => {
                const textContainerAnimation = element.animate(
                  { opacity: [0, 1] },
                  {
                    duration: animationDuration_,
                    fill: "both",
                    easing: "ease-in-out",
                  }
                );
                setAnimationIsRunning(true);
                runWithOwner(owner, () => {
                  createRenderEffect(() => {
                    const expanded = userWantsExpanded();
                    // Still glitches in chrome (probably not fixable) and sometimes the timing is off in Safari but fuck it, I couldn't massage the WAAPI to improve it in any way (without reading computed style) to make the reversing of animations glitch less
                    textContainerAnimation.pause();
                    textContainerAnimation.updatePlaybackRate(expanded ? 1 : -1);
                    textContainerAnimation.play();
                    // This call would be too late without making the Show only being able to read the updated isExpanded after this effect has ran, so this is why we have isExpandedThrottledByOurEffectRun and animationEffectExists
                    setAnimationIsRunning(true);
                    setIsExpandedThrottledByOurEffectRun(expanded);
                  });
                  setAnimationEffectExists(true);
                  onCleanup(() => setAnimationEffectExists(false));
                });
                for (const ev of ["cancel", "finish"] as const) {
                  textContainerAnimation.addEventListener(
                    ev,
                    catchify(() => setAnimationIsRunning(false))
                  );
                }
                disconnector();
              })
            );
          }}
        >
          <div class="text-container">
            <span class="d-title line-clamp" {...(title() && { title: title() })}>
              {title() ?? <TextPlaceholder height="1em" width="20ch" />}
            </span>
            <span class="d-price" classList={{ sale: isOnSale() }}>
              <Show
                when={variantToUse() && !salePrice.loading}
                fallback={<TextPlaceholder height="1em" width="20ch" />}
              >
                {/* After .loading has completed, .latest will no longer trigger suspense when read. Use that to remove the price if fetching has failed. */}
                <Show when={salePrice.latest}>
                  {priceFormatting_().pre_}
                  <SolidFormatPrice price_={salePrice()!} price_formatting_={priceFormatting_()} />
                  {priceFormatting_().post_}
                </Show>
              </Show>
            </span>
            <Show when={isOnSale()}>
              <span class="d-price original">
                <Show
                  when={variantToUse() && !originalPrice.loading}
                  fallback={<TextPlaceholder height="1em" width="20ch" />}
                >
                  <Show when={salePrice.latest}>
                    {priceFormatting_().pre_}
                    <SolidFormatPrice price_={originalPrice()!} price_formatting_={priceFormatting_()} />
                    {priceFormatting_().post_}
                  </Show>
                </Show>
              </span>
            </Show>
          </div>
          <Show when={FavoriteButton_}>
            <FavoriteButton display_={display_} />
          </Show>
        </div>
      </Show>
    </a>
  );
}
