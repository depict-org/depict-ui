import {
  ImageContainer,
  ImagePlaceholder,
  media_query_to_accessor,
  ModernDisplayWithPageUrl,
  SDKRenderingInfo,
  ShopifyContainedImage,
  SlidableItems,
  TextPlaceholder,
  useProductCardIndex,
  useProductCardIsVisible,
  useSlidableInformation,
  useVisibilityState,
  shopifyContainedImageContextSymbol,
  useListing,
  usePLPLayout,
} from "@depict-ai/ui/latest";
import { catchify, dlog, dwarn } from "@depict-ai/utilishared/latest";
import {
  type Accessor,
  children,
  createContext,
  createEffect,
  createMemo,
  createRenderEffect,
  createResource,
  createSignal,
  For,
  type JSX,
  on,
  onCleanup,
  type Resource,
  type Setter,
  Show,
  type Signal,
  Suspense,
  untrack,
  useContext,
} from "solid-js";
import { classList, createComponent } from "solid-js/web";
// You can import from the solid-js library here and leverage its reactivity to create an interactive UI.
// Also, Depict packages can be imported (you must import /latest from those).

type TextOptions = {
  /** Enabled */
  enabled: boolean;
  /** Bold */
  bold: boolean;
  /** Italic */
  italic: boolean;
  /** Font Size Rem */
  font_size_rem: number;
  /** Color */
  color: string;
  /** Bg Color */
  bg_color?: string | null;
};

export type ProductCardSchema = {
  /**
   * Image Radius
   * @enum {string}
   */
  image_radius: "none" | "sm" | "md" | "lg";
  /**
   * Alignment
   * @enum {string}
   */
  alignment: "left" | "center" | "right";
  title: TextOptions;
  price: TextOptions;
  original_price: TextOptions;
  smart_labels: TextOptions;
  /** Color Options */
  color_options: boolean;
  /** Sizes */
  sizes: boolean;
  /** Use Hover Image */
  use_hover_image: boolean;
  /** Image Carousel */
  image_carousel: boolean;
  image_aspect_ratio: number;
  is_ejected: boolean;
};

const sizeOrder = [
  "XXXXS",
  "4XS",
  "XXXS",
  "3XS",
  "XXS",
  "2XS",
  "XX-SMALL",
  "XS",
  "X-SMALL",
  "XS/S",
  "S",
  "SMALL",
  "S/M",
  "M",
  "MEDIUM",
  "M/L",
  "L",
  "LARGE",
  "L/XL",
  "XL",
  "X-LARGE",
  "1X",
  "XL/XXL",
  "XXL",
  "2XL",
  "XX-LARGE",
  "2X",
  "XXXL",
  "3XL",
  "3X",
  "XXXXL",
  "4XL",
  "4X",
  "One Size",
  "Onesize",
];
const ContainsColorSwatchesContext = /*@__PURE__*/ createContext<Signal<boolean>>();
let colorCanvasContext: CanvasRenderingContext2D | undefined | null;

export function DefaultSolidProductCard(
  display: Accessor<null | ModernDisplayWithPageUrl<YourDisplay>>,
  info:
    | undefined
    | (SDKRenderingInfo & {
        // formatPrice takes a price as number (`price` is NOT in cents but the actual price, as returned from Depict) and returns a formatted string. It will use the same currency formatting that the shopify store is configured to use.
        // In development (product card editor), a fallback formatting will be used.
        formatPrice: <T extends number | undefined>(price: T) => T extends undefined ? undefined : string;
      }),
  configuredOptions_: Accessor<
    ProductCardSchema & {
      /**
       * used in Depict portal where we don't have a provider with an IntersectionObserver
       */
      forceIsVisible_?: boolean;
      /**
       * Used in Depict shopify app admin UI when this is a non-user configured product card
       */
      overrideMainAttributes_?: JSX.HTMLAttributes<HTMLDivElement>;
    }
  >,
  overrideAspectRatio?: Accessor<number>
) {
  const variantDisplays = createMemo(() => display()?.variant_displays);
  const defaultVariantIndex = createMemo(() => display()?.variant_index);
  const [showVariantIndex, setShowVariantIndex] = createSignal<number | undefined>(untrack(defaultVariantIndex));
  const [cardIsHovered, setCardIsHovered] = createSignal(false);
  const [widthAvailableForSizes, setWidthAvailableForSizes] = createSignal<number | undefined>();
  const variantToShow = createMemo(() => variantDisplays()?.[showVariantIndex() as number]);
  const noHoverSupport_ = media_query_to_accessor("(hover: none)");
  const [salePrice] = createResource(variantToShow, v => v?.sale_price);
  const [originalPrice] = createResource(variantToShow, v => v?.original_price);
  const onSale = createMemo(() => <Suspense>{originalPrice() !== salePrice()}</Suspense>);
  const aspectRatio_ = createMemo(() => overrideAspectRatio?.() || configuredOptions_().image_aspect_ratio);
  const hasSizes = () => configuredOptions_().sizes && sizesInStock_().size > 1;
  const sizesInStock_ = createMemo(
    () =>
      new Map(
        variantDisplays()
          ?.map(d => [d.size_name, d.in_stock] as const)
          .filter(([name]) => name) as [string, boolean][]
      )
  );
  const titleOptions = createMemo(() => configuredOptions_().title);
  const colorMap = createMemo(
    () =>
      new Map(
        variantDisplays()
          ?.map(
            (variant, index) =>
              [
                variant.color_name,
                {
                  hexColor_: variant.color_name,
                  pageUrl_: variant.page_url,
                  variantIndex_: index,
                },
              ] as const
          )
          .filter(([colorName]) => colorName) // in case color_name is null
      )
  );
  const swatchContainerHeight = createMemo(() => {
    // To avoid the product cards switching around as one hovers and price switches to the swatches, we have to make the swatches container have the same height as the price one
    let considerSize: number[] = [];
    const { original_price, price } = configuredOptions_();
    const isOnSale = (onSale as any)?.()?.(); // Hack for getting if we're on sale without triggering <Suspense> above us
    if (price.enabled) {
      considerSize.push(price.font_size_rem);
    }
    if (original_price.enabled && isOnSale) {
      considerSize.push(original_price.font_size_rem);
    }
    if (!considerSize.length) return;
    return Math.max(...considerSize);
  });

  const LinkWrapped = (props: {
    children: JSX.Element;
    class?: string;
    ref?: (el: HTMLAnchorElement) => void;
    focusable_?: boolean;
  }) => (
    <a
      class={props.class}
      href={variantToShow()?.page_url || "#"}
      // Work around https://github.com/solidjs/solid/issues/2137
      ref={el => props?.ref?.(el)}
      aria-hidden={!props.focusable_}
      tabIndex={props.focusable_ ? undefined : -1}
      onClick={catchify(e => {
        const { target } = e;
        const navbuttonSelector = ".d-navbutton";
        if (target.matches(navbuttonSelector) || target.closest(navbuttonSelector)) {
          // Don't navigate if optional slider button that can be shown using css was clicked
          e.preventDefault();
        }
      })}
    >
      {props.children}
    </a>
  );
  const Title = (props: { ref_?: (el: HTMLDivElement) => void }) => (
    <div
      class="d-title line-clamp"
      title={variantToShow()?.title}
      ref={el => {
        props.ref_?.(el);
        setStyleForTextOptions(el, titleOptions);
      }}
    >
      {variantToShow()?.title ?? (
        <>
          <TextPlaceholder height="1em" width="20ch" />
          <TextPlaceholder height="1em" width="20ch" />
        </>
      )}
    </div>
  );
  const mainStyle = () => {
    const { alignment } = configuredOptions_();
    let flexAlignment: "flex-start" | "flex-end" | "center";
    switch (alignment) {
      case "left":
        flexAlignment = "flex-start";
        break;
      case "right":
        flexAlignment = "flex-end";
        break;
      default:
        flexAlignment = alignment;
        break;
    }
    return { "--flex-alignment": flexAlignment, "--alignment": alignment };
  };

  createEffect(() => noHoverSupport_() && setCardIsHovered(false));
  // For switch from placeholders to product
  createEffect(
    () => !showVariantIndex() && defaultVariantIndex() != undefined && setShowVariantIndex(defaultVariantIndex())
  );

  const element = (
    <ContainsColorSwatchesProvider>
      <div
        class="d-product-card"
        style={mainStyle()}
        onMouseEnter={catchify(() => !noHoverSupport_() && setCardIsHovered(true))}
        onMouseLeave={catchify(() => !noHoverSupport_() && setCardIsHovered(false))}
        {...configuredOptions_().overrideMainAttributes_}
      >
        <LinkWrapped class="upper" focusable_={true}>
          <ImagesAndVideos
            image_urls_={() => variantToShow()?.image_urls}
            video_={() => variantToShow()?.video}
            configuredOptions_={configuredOptions_}
            cardIsHovered_={() => showVariantIndex() === display()?.variant_index && cardIsHovered()}
            aspectRatio_={aspectRatio_}
            noHoverSupport_={noHoverSupport_}
            forceIsVisible_={() => configuredOptions_().forceIsVisible_}
          />
        </LinkWrapped>
        <Suspense>
          <Show when={configuredOptions_().smart_labels.enabled}>
            <div class="d-badges">
              {/* Other badges can be added here */}
              <Show when={salePrice() && originalPrice() && salePrice() !== originalPrice()}>
                <div
                  class="d-badge d-off"
                  ref={el => setStyleForTextOptions(el, () => configuredOptions_().smart_labels)}
                >
                  {Math.round((1 - salePrice()! / originalPrice()!) * -100)}%
                </div>
              </Show>
            </div>
          </Show>
        </Suspense>
        {(() => {
          // We want the whole product card to be a link, except for the color swatches
          const [containsColorSwatches] = useContainsColorSwatches();
          const LinkWrappedIfHaveSwatches = (props: { children: JSX.Element }) => {
            const resolved = children(() => props.children);
            return (
              <Show when={containsColorSwatches()} fallback={resolved()}>
                <LinkWrapped>{resolved()}</LinkWrapped>
              </Show>
            );
          };

          return (
            <Show
              when={
                titleOptions().enabled || configuredOptions_().price.enabled || hasSizes() || containsColorSwatches()
              }
            >
              <InComponentOrDiv component_={!containsColorSwatches() && LinkWrapped} class_="text-container">
                <Show
                  when={titleOptions().enabled}
                  fallback={
                    <Show when={configuredOptions_().sizes}>
                      <LinkWrappedIfHaveSwatches>
                        <Sizes
                          sizesInStock_={sizesInStock_}
                          fontSizeRem_={() => titleOptions().font_size_rem}
                          widthAvailableForSizes_={widthAvailableForSizes}
                        />
                      </LinkWrappedIfHaveSwatches>
                    </Show>
                  }
                >
                  <Show
                    when={hasSizes()}
                    fallback={
                      <LinkWrappedIfHaveSwatches>
                        <Title />
                      </LinkWrappedIfHaveSwatches>
                    }
                  >
                    <AnimatedRowSwitch
                      DefaultComponent_={Title}
                      HoveredComponent_={({ ref_ }) => (
                        <Sizes
                          sizesInStock_={sizesInStock_}
                          fontSizeRem_={() => titleOptions().font_size_rem}
                          ref_={ref_}
                          widthAvailableForSizes_={widthAvailableForSizes}
                        />
                      )}
                      cardIsHovered_={cardIsHovered}
                      containerComponent_={() => containsColorSwatches() && LinkWrapped}
                    />
                  </Show>
                </Show>
                <Show
                  when={configuredOptions_().price.enabled}
                  fallback={
                    configuredOptions_().color_options && (
                      <ColorSwatches
                        colorMap_={colorMap}
                        showVariantIndex_={showVariantIndex}
                        setShowVariantIndex_={setShowVariantIndex}
                        colorsAtIndex_={() => variantDisplays()?.map(variant => variant.color_name)}
                        wantedContainerHeightRem_={swatchContainerHeight}
                        defaultVariantIndex_={defaultVariantIndex}
                      />
                    )
                  }
                >
                  <Show
                    when={configuredOptions_().color_options && colorMap().size > 1}
                    fallback={
                      <Prices
                        variantToShow_={variantToShow}
                        formatPrice_={info?.formatPrice}
                        configuredOptions_={configuredOptions_}
                        salePrice_={salePrice}
                        originalPrice_={originalPrice}
                        wrapperComponent_={() => containsColorSwatches() && LinkWrapped}
                      />
                    }
                  >
                    <AnimatedRowSwitch
                      containerComponent_={() => !containsColorSwatches() && LinkWrapped}
                      DefaultComponent_={({ ref_ }) => (
                        <Prices
                          variantToShow_={variantToShow}
                          formatPrice_={info?.formatPrice}
                          salePrice_={salePrice}
                          originalPrice_={originalPrice}
                          configuredOptions_={configuredOptions_}
                          wrapperComponent_={() => containsColorSwatches() && LinkWrapped}
                          ref_={ref_}
                        />
                      )}
                      HoveredComponent_={({ ref_, isHidden_ }) => (
                        <ColorSwatches
                          colorMap_={colorMap}
                          showVariantIndex_={showVariantIndex}
                          setShowVariantIndex_={setShowVariantIndex}
                          colorsAtIndex_={() => variantDisplays()?.map(variant => variant.color_name)}
                          ref_={ref_}
                          wantedContainerHeightRem_={swatchContainerHeight}
                          defaultVariantIndex_={defaultVariantIndex}
                          isHidden_={isHidden_}
                        />
                      )}
                      cardIsHovered_={cardIsHovered}
                    />
                  </Show>
                </Show>
              </InComponentOrDiv>
            </Show>
          );
        })()}
      </div>
    </ContainsColorSwatchesProvider>
  );

  // Now that we have created the ShopifyContainedImage, we can hook into its resize observer to know how many sizes we can fit into the size container
  const context = useListing();
  if (context) {
    const signal = context[shopifyContainedImageContextSymbol] as
      | Signal<[Accessor<number>, Accessor<number>] | undefined>
      | undefined;
    createEffect(() => setWidthAvailableForSizes(signal?.[0]?.()?.[0]?.()));
  }

  return element;
}

/**
 * Transitions between DefaultComponent_ and HoveredComponent_ when cardIsHovered_ changes in both height and opacity.
 */
function AnimatedRowSwitch({
  DefaultComponent_,
  HoveredComponent_,
  cardIsHovered_,
  containerComponent_,
}: {
  DefaultComponent_: (props: { ref_: (el: HTMLElement) => void }) => JSX.Element;
  HoveredComponent_: (props: { ref_: (el: HTMLElement) => void; isHidden_: Accessor<boolean> }) => JSX.Element;
  cardIsHovered_: Accessor<boolean>;
  containerComponent_: Accessor<
    false | ((props: { ref?: (el: HTMLElement) => void; class: string; children: JSX.Element }) => JSX.Element)
  >;
}) {
  let defaultElement: HTMLElement;
  let hoveredElement: HTMLElement;
  let containerElement: HTMLElement;
  let defaultElementAnimation: Animation | undefined;
  let hoveredElementAnimation: Animation | undefined;
  let containerAnimation: Animation | undefined;
  const fadeInKeyframes = [
    { opacity: 0, pointerEvents: "none", cursor: "default" },
    { opacity: 1, pointerEvents: "auto", cursor: "unset" },
  ];
  const fadeOutKeyframes = [...fadeInKeyframes].reverse();

  createEffect(firstRun => {
    const isHovered = cardIsHovered_();
    if (!hoveredElement || !defaultElement) return; // Got no sizes probably, can't switch to anything

    const hoveredStyle = hoveredElement.style;
    const defaultStyle = defaultElement.style;
    const containerStyle = containerElement.style;
    const duration = 200;
    const easing = "ease-in-out";

    hoveredStyle.position = "absolute";

    if (firstRun) {
      Object.assign(hoveredStyle, fadeInKeyframes[0]);
      return;
    }

    defaultStyle.position = "absolute";

    // These animations we can let live forever, since opacity always goes between 0 and 1
    hoveredElementAnimation ||= hoveredElement.animate(fadeInKeyframes, {
      duration,
      fill: "both",
      easing,
    });
    defaultElementAnimation ||= defaultElement.animate(fadeOutKeyframes, {
      duration,
      fill: "both",
      easing,
    });

    if (!containerAnimation) {
      const containerKeyframes = [
        { height: defaultElement.getBoundingClientRect().height + "px" },
        { height: hoveredElement.getBoundingClientRect().height + "px" },
      ];
      containerAnimation = containerElement.animate(containerKeyframes, { duration, easing });
      containerAnimation.finished.then(() => {
        containerAnimation?.cancel();
        containerAnimation = undefined;
        // Animation can survive direction change so need to get current hovered state when it finishes
        const hoveredNow = untrack(cardIsHovered_);
        containerStyle.height = "";
        if (hoveredNow) {
          hoveredStyle.position = "";
        } else {
          defaultStyle.position = "";
        }
      });
      if (!isHovered) {
        // When starting the animation in reverse we need to set the current time to the end of the animation
        containerAnimation.currentTime = containerAnimation.effect!.getComputedTiming().endTime!;
      }
      // Remove this animation once it has finished and re-create it later since the size of the elements containing texts might change, i.e. when the window is resized of zoom level adjusted
    }

    const animationDirection = isHovered ? 1 : -1;
    defaultElementAnimation.updatePlaybackRate(animationDirection);
    defaultElementAnimation.play();
    hoveredElementAnimation!.updatePlaybackRate(animationDirection);
    hoveredElementAnimation.play();
    containerAnimation!.updatePlaybackRate(animationDirection);
  }, true);

  return (
    <InComponentOrDiv
      component_={containerComponent_()}
      class_="animated-row-switch"
      ref_={(el: HTMLElement) => (containerElement = el)}
    >
      <DefaultComponent_ ref_={el => (defaultElement = el)} />
      <HoveredComponent_ ref_={el => (hoveredElement = el)} isHidden_={() => !cardIsHovered_()} />
    </InComponentOrDiv>
  );
}

function ColorSwatches({
  colorMap_,
  setShowVariantIndex_,
  showVariantIndex_,
  colorsAtIndex_,
  wantedContainerHeightRem_,
  defaultVariantIndex_,
  ref_,
  isHidden_,
}: {
  colorMap_: Accessor<Map<string, { hexColor_: string; pageUrl_: string; variantIndex_: number }>>;
  setShowVariantIndex_: Setter<number | undefined>;
  showVariantIndex_: Accessor<number | undefined>;
  colorsAtIndex_: Accessor<string[] | undefined>;
  wantedContainerHeightRem_: Accessor<number | undefined>;
  defaultVariantIndex_: Accessor<number | undefined>;
  ref_?: (el: HTMLDivElement) => void;
  isHidden_?: Accessor<boolean>;
}) {
  let unHoverDebouncedTimeout: ReturnType<typeof setTimeout> | undefined;
  const entriesToShow = () => [...colorMap_().entries()].slice(0, 12);
  const [, setContainsColorSwatches] = useContainsColorSwatches();

  return (
    <Show when={entriesToShow().length > 1}>
      {(() => {
        setContainsColorSwatches(true);
        onCleanup(() => setContainsColorSwatches(false));

        return (
          <div
            class="d-swatches"
            ref={el => {
              ref_?.(el);
              // Do like this so we don't override other styles set by AnimateRowSwitch
              createEffect(() =>
                setPropertyIfExists(
                  el.style,
                  "--swatch-container-height",
                  wantedContainerHeightRem_() && wantedContainerHeightRem_() + "rem"
                )
              );
            }}
          >
            <For each={entriesToShow()}>
              {([colorName, { pageUrl_, hexColor_, variantIndex_ }]) => {
                const thisColorIsDefaultColor = createMemo(
                  () => colorsAtIndex_()?.[defaultVariantIndex_() as number] === colorName
                );
                // Since we don't have actual colors right now and rely on color names working as css colors
                // We need a default fallback for it being usable
                const [invalidColor, setInvalidColor] = createSignal(false);

                return (
                  <a
                    onPointerEnter={catchify(e => {
                      clearTimeout(unHoverDebouncedTimeout);
                      setShowVariantIndex_(thisColorIsDefaultColor() ? defaultVariantIndex_() : variantIndex_);
                    })}
                    onPointerLeave={catchify(e => {
                      clearTimeout(unHoverDebouncedTimeout);
                      unHoverDebouncedTimeout = setTimeout(
                        catchify(() => setShowVariantIndex_(defaultVariantIndex_())),
                        500
                      );
                    })}
                    aria-hidden={isHidden_?.()}
                    tabIndex={isHidden_?.() ? -1 : undefined}
                    href={pageUrl_}
                    class="d-swatch"
                    ref={element =>
                      requestAnimationFrame(
                        // After one frame we're usually in the DOM, if we're not boxShadow is ""
                        // If it's none, the color was invalid - so just show this swatch as a white swatch which is the prettiest
                        catchify(() => getComputedStyle(element).boxShadow === "none" && setInvalidColor(true))
                      )
                    }
                    title={colorName}
                    // Value first take canvas color because it's more likely to exist for for example Aubergine
                    style={`--background:${invalidColor() ? "white" : hexColor_}`}
                    classList={{
                      selected: colorsAtIndex_()?.[showVariantIndex_()!] === colorName,
                      first: thisColorIsDefaultColor(),
                      "light-colored": isLightColor(hexColor_) || invalidColor(),
                    }}
                  />
                );
              }}
            </For>
            <Show when={entriesToShow().length !== colorMap_().size}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" class="more">
                <path d="M10.8 6c0 .153-.061.299-.169.407s-.255.169-.407.169H6.576v3.648c0 .153-.061.299-.169.407S6.153 10.8 6 10.8s-.299-.061-.407-.169-.169-.255-.169-.407V6.576H1.776c-.153 0-.299-.061-.407-.169S1.2 6.153 1.2 6s.061-.299.169-.407.255-.169.407-.169h3.648V1.776c0-.153.061-.299.169-.407S5.847 1.2 6 1.2s.299.061.407.169.169.255.169.407v3.648h3.648c.153 0 .299.061.407.169s.169.255.169.407z" />
              </svg>
            </Show>
          </div>
        );
      })()}
    </Show>
  );
}

function Sizes({
  sizesInStock_,
  ref_,
  fontSizeRem_,
  widthAvailableForSizes_,
}: {
  sizesInStock_: Accessor<Map<string, boolean>>;
  ref_?: (el: HTMLDivElement) => void;
  fontSizeRem_: Accessor<number>;
  widthAvailableForSizes_: Accessor<number | undefined>;
}) {
  const keys = createMemo(() => [...sizesInStock_().keys()]);
  const gap = createMemo(() => ((widthAvailableForSizes_() as number) <= 250 ? 12 : 16));
  const showMax = createMemo(() => {
    const fontSizeCircaPx = fontSizeRem_() * 16;
    const availableWidth = widthAvailableForSizes_();
    if (availableWidth && availableWidth < fontSizeCircaPx * 7 + gap() * 7 && keys().length > 4) {
      return 2;
    }
    return 7;
  });
  const keysToShow = createMemo(() => keys().slice(0, showMax()));
  const hidden = createMemo(() => keys().length - keysToShow().length);

  return (
    <Show when={keysToShow().length > 1}>
      <div
        class="sizes"
        classList={{ small: (widthAvailableForSizes_() as number) < 250 }}
        ref={el => {
          ref_?.(el);
          // Do like this so we don't override other styles set by AnimateRowSwitch
          createEffect(() => el.style.setProperty("--font-size-rem", fontSizeRem_() + "rem"));
          createEffect(() => el.style.setProperty("--sizes-gap", gap() + "px"));
        }}
      >
        <For each={sortSizes(keysToShow())}>
          {size => (
            <Show when={sizesInStock_().get(size)} fallback={<s>{size}</s>}>
              <span>{size}</span>
            </Show>
          )}
        </For>
        <Show when={hidden() > 0}>
          <span class="more">+ {hidden()} more</span>
        </Show>
      </div>
    </Show>
  );
}

function setPropertyIfExists(style: CSSStyleDeclaration, property: string, value?: string | false | 0 | null) {
  if (value) {
    style.setProperty(property, value);
  } else {
    style.removeProperty(property);
  }
}

function setStyleForTextOptions({ style }: HTMLElement, options: Accessor<TextOptions>) {
  // Doing this instead of just using style={} because AnimatedRowSwitch needs to be able to set inline styling without it being overridden
  createEffect(() => setPropertyIfExists(style, "--font-size-rem", options().font_size_rem + "rem"));
  createEffect(() => setPropertyIfExists(style, "--font-weight", options().bold && "bold"));
  createEffect(() => setPropertyIfExists(style, "--font-style", options().italic && "italic"));
  createEffect(() => setPropertyIfExists(style, "--color", options().color));
  createEffect(() => setPropertyIfExists(style, "--background", options().bg_color));
}

function ImagesAndVideos({
  image_urls_,
  video_,
  configuredOptions_,
  cardIsHovered_,
  aspectRatio_,
  noHoverSupport_,
  forceIsVisible_,
}: {
  image_urls_: Accessor<undefined | string[]>;
  video_: Accessor<undefined | { preview_image_url: string; video_urls: string[] }>;
  configuredOptions_: Accessor<ProductCardSchema>;
  cardIsHovered_: Accessor<boolean>;
  aspectRatio_: Accessor<number>;
  noHoverSupport_: Accessor<boolean>;
  forceIsVisible_: Accessor<boolean | undefined>;
}) {
  const PLPLayout = usePLPLayout();
  const containerClasses = () => ["image-video", "border-radius-" + configuredOptions_().image_radius] as const;
  const productCardIsVisible = useProductCardIsVisible();
  const hasBeenVisible = createMemo<boolean | undefined>(prev => prev || productCardIsVisible() || forceIsVisible_());
  const video_urls = () => video_()?.video_urls;
  const hasVideo = createMemo(() => video_urls()?.length);
  const hoverImageDisabled = createMemo(() => !configuredOptions_().use_hover_image || noHoverSupport_());
  const hasEnoughImagesForSlider = createMemo<boolean | undefined>(prev => {
    if (prev) return prev; // If we had it once, keep the slider (since removing it is not expected by some code IIRC and could look glitchy)
    let minImagesAvailableToEnableSwipe = 2;
    if (hasVideo()) {
      minImagesAvailableToEnableSwipe--;
    } else if (!hoverImageDisabled()) {
      minImagesAvailableToEnableSwipe++;
    }
    return (image_urls_()?.length as number) >= minImagesAvailableToEnableSwipe;
  });
  const slidable = createMemo(
    () =>
      // Don't make cards swipable inside of sliders (PLP slider or recs slider)
      !(useSlidableInformation() || PLPLayout?.()?.startsWith("slider")) &&
      configuredOptions_().image_carousel &&
      // Delay creation of slider until card has been visible. We can't do it until the user interacts with it because it sometimes glitches the hover effect, but initialising the slider takes some time (need to compute if the buttons should be shown, there's a Mutationobserver, etc) so it's good to not initialise all at once (for example when going back)
      // Don't delay the creation of the slider if there's a video, since (contrary to what I've observed with images) the move of the video in the DOM will abort the playback, which will abort the network request, which delays the playback of the video significantly
      (hasBeenVisible() || hasVideo()) &&
      hasEnoughImagesForSlider()
  );
  const [userTriedSliding, setUserTriedSliding] = createSignal(false);
  const [swipedPastVideo_, setSwipedPastVideo] = createSignal(false);

  const Container = (props: { children: JSX.Element }) => {
    const resolved = children(() => props.children);
    return (
      <Show when={slidable()} fallback={<div class={containerClasses().join(" ")}>{resolved()}</div>}>
        {(() => {
          const [userHoveredImage, setUserHoveredImage] = createSignal(false);
          const allowPromotingToLayer = createMemo(() => {
            if (noHoverSupport_()) {
              // It's not possible to swipe a container that gets an overflow due to the same touch in iOS safari, but to still not have shit performance (especially when going back) we set overflow: hidden on all images that on product cards that are not within the viewport
              return productCardIsVisible();
            }
            return userHoveredImage();
          });

          return (
            <SlidableItems
              arrow_height_={25}
              arrow_width_={12.5}
              disable_fading_={true}
              slider_ref_={slider => {
                const { container, insert_here } = slider;
                slider.stepstoslide = 1; // In case anyone enables the hidden buttons using css

                createRenderEffect<{ [k: string]: boolean } | undefined>(previous =>
                  classList(
                    container,
                    { products: true, ...Object.fromEntries(containerClasses().map(cls => [cls, true])) },
                    previous
                  )
                );

                // Prevent the browser from promoting our slider to its own layer, which is terrible for performance, until the user actually has tried to interact with the swipability
                // -> this is for rendering performance
                // See https://depictaiworkspace.slack.com/archives/C02BASM9X5J/p1714038914867749?thread_ts=1714038547.501939&cid=C02BASM9X5J
                createRenderEffect(() => (insert_here.style.overflow = allowPromotingToLayer() ? "" : "hidden"));

                // If hovered, remove overflow: hidden so user can try swiping
                container.addEventListener("pointerenter", () => setUserHoveredImage(true), { once: true });

                // Scroll to beginning when changing what variant we're showing
                createEffect(
                  on(image_urls_, () => insert_here.scrollTo({ left: 0, behavior: "auto" }), { defer: true })
                );
              }}
            >
              {(() => {
                const slidableInformation = useSlidableInformation();

                createEffect(() => {
                  // Actually render (and load) the other images when the slider gets swiped
                  slidableInformation!.intersectionEntries_(); // Re-check when intersecting entries change
                  const intersectingsObject = slidableInformation?.slider_.intersecting_items_object;
                  if (1 in intersectingsObject!) {
                    setUserTriedSliding(true);
                  }

                  // Pause video when swiping to the next image
                  // If intersection observers haven't started yet or we aren't in a slider, we count as visible for faster playback
                  if (!intersectingsObject || !Object.keys(intersectingsObject).length) return;
                  // Video is always the first card in the slider
                  const ratio = intersectingsObject?.[0]?.intersectionRatio;
                  setSwipedPastVideo(!ratio);
                });

                return resolved as unknown as JSX.Element;
              })()}
            </SlidableItems>
          );
        })()}
      </Show>
    );
  };
  const [itemsWantingToBeRendered, setItemsWantingToBeRendered] = createSignal<symbol[]>([], { equals: false });
  // When slidable, only render extra items (and therefore fetch images) when the user actually tried swiping -> this is for better network performance
  const MaybeShowLazily = (props: { children: JSX.Element }) => {
    const us = Symbol();
    setItemsWantingToBeRendered(prev => {
      prev.push(us);
      return prev;
    });
    onCleanup(() => setItemsWantingToBeRendered(prev => prev.filter(item => item !== us)));
    return (
      // Render the first two items immediately, so the slider can be swiped and there is an image when it's done.
      // After it has been swiped, render (and fetch the images) for the rest.
      <Show when={!slidable() || userTriedSliding() || itemsWantingToBeRendered().indexOf(us) < 2}>
        {props.children}
      </Show>
    );
  };

  return (
    <Show when={image_urls_()} fallback={<ImagePlaceholder aspectRatio={aspectRatio_()} />}>
      <Container>
        <Show when={hasVideo()}>
          <MaybeShowLazily>
            <div class="media-item video">
              <ImageContainer aspectRatio={aspectRatio_()}>
                <Video
                  video_sources_={video_urls() as [string, ...string[]]}
                  poster_={video_()?.preview_image_url || image_urls_()?.[0]}
                  forceIsVisible_={forceIsVisible_()}
                  swipedPastVideo_={swipedPastVideo_()}
                />
              </ImageContainer>
            </div>
          </MaybeShowLazily>
        </Show>
        <Show when={!hasVideo() || slidable()}>
          <For each={slidable() ? image_urls_() : image_urls_()?.slice(0, 1)}>
            {(image_url, index) => (
              <Show when={hoverImageDisabled() || index() !== 1}>
                {/* The image with index 1 will already be shown as hover image if hover is supported, so hide it in the slider
           (We assume people don't discover the slider can be slided on desktop) */}
                <MaybeShowLazily>
                  <div class="media-item image">
                    {/* Hover to see JSDOc for ShopifyContainedImage */}
                    <ShopifyContainedImage
                      src={image_url}
                      aspectRatio={aspectRatio_()}
                      imgProps={{ alt: "Product image" }}
                    />
                    <Show when={!index() && image_urls_()?.[1] && !hoverImageDisabled()}>
                      <ShopifyContainedImage
                        src={image_urls_()![1]}
                        aspectRatio={aspectRatio_()}
                        imgProps={{ alt: "Product image" }}
                        class={`hover${cardIsHovered_() ? " visible" : ""}`}
                      />
                    </Show>
                  </div>
                </MaybeShowLazily>
              </Show>
            )}
          </For>
        </Show>
      </Container>
    </Show>
  );
}

function Video(props: {
  video_sources_: [string, ...string[]];
  poster_?: string;
  forceIsVisible_?: boolean;
  swipedPastVideo_: boolean;
}) {
  // Making some assumptions for shopify here rn, change those if wanting to support other browsers too

  const tabIsVisible = useVisibilityState();
  const hlsSource = createMemo(() => props.video_sources_.find(src => src.endsWith(".m3u8"))); // Prefer HLS when given by backend and browser supported
  // This is because HLS automatically lets the browser choose both a fitting resolution and quality, depending on video dimensions and network conditions
  const nonHLSSources = createMemo(() => {
    const sources = props.video_sources_?.filter(src => !src.endsWith(".m3u8"));
    try {
      sortVideoUrlsByQuality(sources);
    } catch (e) {
      dlog("Sorting by quality failed", e);
    }
    return sources;
  });
  const productCardIndexAccessor = useProductCardIndex();
  const cardIsVisible = useProductCardIsVisible();

  return (
    <video
      class="s-responsive-image"
      controls={false}
      playsinline={true}
      poster={props.poster_}
      loop={true}
      muted={true}
      crossOrigin="anonymous"
      disablepictureinpicture={true}
      ref={element => {
        createEffect(() => {
          if ((cardIsVisible() || props.forceIsVisible_) && tabIsVisible() && !props.swipedPastVideo_) {
            element.play().catch(e => dwarn("Error playing video", e));
          } else {
            element.pause();
          }
        });
      }}
      // Preload videos that are probably above the fold
      {...((productCardIndexAccessor?.() as number) < 8 && { preload: "auto" })}
    >
      <Show when={hlsSource()}>
        <source src={hlsSource()} type="application/x-mpegURL" />
      </Show>
      <For each={nonHLSSources()}>{source => <source src={source} />}</For>
    </video>
  );
}

function sortVideoUrlsByQuality(urls: string[]): string[] {
  // Function to extract resolution from a URL, assuming format consistency
  function getResolution(url: string): number {
    const match = url.match(/(\d+)p/);
    return match ? parseInt(match[1], 10) : 0;
  }

  // Sort the URLs based on the resolution extracted
  return urls.sort((a, b) => {
    const resolutionA = getResolution(a);
    const resolutionB = getResolution(b);

    // For descending order, compare B to A
    return resolutionB - resolutionA;
  });
}

function Prices({
  formatPrice_,
  configuredOptions_,
  salePrice_,
  originalPrice_,
  ref_,
  variantToShow_,
  wrapperComponent_,
}: {
  variantToShow_: Accessor<(YourVariantDisplay & { page_url: string }) | undefined>;
  formatPrice_: undefined | (<T extends number | undefined>(price: T) => T extends undefined ? undefined : string);
  configuredOptions_: Accessor<ProductCardSchema>;
  salePrice_: Resource<number | undefined>;
  originalPrice_: Resource<number | undefined>;
  wrapperComponent_: Accessor<
    | false
    | ((props: { class: string; children: JSX.Element; ref?: (el: HTMLElement) => void | undefined }) => JSX.Element)
  >;
  ref_?: (el: HTMLElement) => void;
}) {
  // Depict is fetching the prices from Shopify's storefront API on the frontend. This is because getting all prices in all currencies from Shopify be too computationally intensive (~1 million prices for some customers that can change at any time depending on exchange rate).
  // This is why the prices are wrapped in a Promise (we want to render product cards without having to wait for the price request).
  const priceOptions = () => configuredOptions_().price;
  const originalPriceOptions = () => configuredOptions_().original_price;

  return (
    <Show when={priceOptions().enabled}>
      <InComponentOrDiv component_={wrapperComponent_()} class_="price-container" ref_={ref_}>
        <span class="price" ref={el => setStyleForTextOptions(el, priceOptions)}>
          <Show
            when={variantToShow_()}
            fallback={
              // When depict API request not completed (display is null), always show a placeholder for the price
              <TextPlaceholder height="1em" width="5ch" />
            }
          >
            {/* If we are not rendering a pure placeholder card, show a placeholder for the price, while it's loading - and then show the price (or nothing if it failed to load) */}
            <Suspense fallback={<TextPlaceholder height="1em" width="5ch" />}>{formatPrice_?.(salePrice_())}</Suspense>
          </Show>
        </span>
        {/* Suspense renders its fallback until all resources read within it have resolved.
      Depict renders the `ProductCard` component itself inside a <Suspense>.
      Therefore, we have to wrap our resource accesses here (and above) in <Suspense>, because we want to show the rest of the product card already while the prices are loading */}
        <Suspense>
          {/* Only show original price if it exists and deviates from the salePrice */}
          <Show when={originalPrice_() !== salePrice_() && originalPriceOptions().enabled}>
            {" "}
            <span class="original-price" ref={el => setStyleForTextOptions(el, originalPriceOptions)}>
              {formatPrice_?.(originalPrice_())}
            </span>
          </Show>
        </Suspense>
      </InComponentOrDiv>
    </Show>
  );
}

function isLightColor(anyCssColor: string) {
  // Source: https://stackoverflow.com/a/47355187
  colorCanvasContext ||= document.createElement("canvas").getContext("2d");
  colorCanvasContext!.fillStyle = anyCssColor;
  const asHex = colorCanvasContext!.fillStyle;

  // Source: https://stackoverflow.com/a/12043228
  const stripped = asHex.substring(1); // strip #
  const rgb = parseInt(stripped, 16); // convert rrggbb to decimal
  const r = (rgb >> 16) & 0xff; // extract red
  const g = (rgb >> 8) & 0xff; // extract green
  const b = (rgb >> 0) & 0xff; // extract blue

  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709, apparently between 0 and 255

  return luma > 200;
}

function sortSizes(sizesToSort: string[]): string[] {
  const sizeEntries: {
    size: string;
    numericValue_?: number;
  }[] = sizesToSort.map(size => {
    const numericMatch = size.match(/^(\d+)(?:\/\d+)?$/);
    if (numericMatch) {
      // It's a numeric size or a range like "44/46", we sort by the first number.
      return { size, numericValue_: parseInt(numericMatch[1], 10) };
    }
    return { size };
  });

  sizeEntries.sort((a, b) => {
    const indexA = sizeOrder.indexOf(a.size);
    const indexB = sizeOrder.indexOf(b.size);

    // Both sizes are in the predefined list
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    // Handle numeric and mixed sorting
    if (a.numericValue_ != null && b.numericValue_ != null) {
      return a.numericValue_ - b.numericValue_;
    }
    if (a.numericValue_ != null && indexB === -1) {
      return -1; // numeric values come before unknown text
    }
    if (b.numericValue_ != null && indexA === -1) {
      return 1; // numeric values come before unknown text
    }
    // Fallback if both are unrecognized, sort alphabetically
    return a.size.localeCompare(b.size);
  });

  return sizeEntries.map(entry => entry.size);
}

function ContainsColorSwatchesProvider(props: { children: JSX.Element }) {
  const containsSignal = createSignal(false);
  return (
    <ContainsColorSwatchesContext.Provider value={containsSignal}>
      {props.children}
    </ContainsColorSwatchesContext.Provider>
  );
}

function useContainsColorSwatches() {
  return useContext(ContainsColorSwatchesContext)!;
}

// Work around https://github.com/solidjs/solid/issues/2136 and random shit I thought was an issue before I found https://github.com/solidjs/solid/issues/2137
function InComponentOrDiv(props: {
  component_:
    | undefined
    | false
    | ((componentProps: { children: JSX.Element; ref?: (el: HTMLElement) => void; class: string }) => JSX.Element);
  children: JSX.Element;
  class_: string;
  ref_?: (el: HTMLElement) => void;
}) {
  const resolved = children(() => props.children);
  return createMemo(() => {
    const Component = props.component_;
    if (Component) {
      // Written like this because the JSX transform mutates our props object: https://github.com/ryansolid/dom-expressions/pull/316#issuecomment-2066925544
      return createComponent(Component, {
        get class() {
          return props.class_;
        },
        get ref() {
          return props.ref_;
        },
        children: resolved as unknown as JSX.Element,
      });
    }
    return (
      <div class={props.class_} ref={el => props?.ref_?.(el)}>
        {resolved()}
      </div>
    );
  }) as unknown as JSX.Element;
}

interface YourDisplay {
  variant_index: number;
  variant_displays: YourVariantDisplay[];
}

type YourVariantDisplay = {
  // !!!! Please ask Depict for the type definition to put here, or create them yourself from a sample response with https://app.quicktype.io/ !!!!
  title: string;
  image_urls: string[];
  videos?: { preview_image_url: string; video_urls: string[] }[];
  video?: { preview_image_url: string; video_urls: string[] };
  page_url: string;
  color_name: string;
  size_name: string | null;
  in_stock: boolean;
} & (
  | { sale_price: Promise<number>; original_price: Promise<number> }
  | { sale_price: Promise<undefined>; original_price: Promise<undefined> }
);
