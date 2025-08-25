/** @jsxImportSource solid-js */
import { catchify, dwarn, findMostFrequentItem } from "@depict-ai/utilishared";
import {
  Accessor,
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  JSX,
  mergeProps,
  onCleanup,
  Show,
  Signal,
  splitProps,
  untrack,
} from "solid-js";
import { spread } from "solid-js/web";
import { useListing } from "../../helper_functions/ListingContext";
import { useProductCardIndex } from "../../helper_functions/ProductCardIndexContext";

import { requestIdleCallbackWithDynamicTimeout } from "../../helper_functions/requestIdleCallbackWithDynamicTimeout";

const onIdleFunctionsSymbol = /*@__PURE__*/ Symbol("onIdleFunctions");
export const listingContextAspectRatiosSymbol = /*@__PURE__*/ Symbol("listingContextAspectRatios");
export const listingContextMostPrevalentAspectRatioSymbol = /*@__PURE__*/ Symbol("listingContextAspectRatios");

export type MostPrevalentAspectRatio = Signal<number | undefined>;

export type AspectRatiosSet = Set<{
  aspectRatio_: number;
}>;

/**
 * Automatically generate a srcset from the shopify CDN for an image and set the sizes attribute to the provided accessor.
 * Will also delay loading and decoding of image until the browser is idle (with 5s timeout) to improve filtering/loading more performance.
 * If ran within Depict product card rendering, within one of the first 8 product cards, those images will be loaded immediately and loading="lazy" will be ignored for them (unless you set it to "force-lazy").
 * This is used for our responsive images:
 * 1. The image must have a container with a fixed size (or aspect ratio) that is independent of the image. When aspectRatio is configured on the depict-cards element as data attribute, we will wrap the image in a ImageContainer for this. If it's false, the user has to provide this container themselves.
 * 2. We set a ResizeObserver on one of the currently visible images (see makeSizeAccessor)
 * 3. We set the size attribute of all the visible images to the size of the container we're observing. The point of this is that the sizes attribute is used to determine which image to load, and usually it's set by the user and depends on the relationship between image size and viewport size. By using a ResizeObserver, we can make sure the sizes attribute is always set to the correct value without it having to be configured. This will make so the browser always loads the correct image size for a crisp image but still fast load.
 * You need to use insert(domNode, <ShopifyResponsiveImg size={sizeAccessor} src={src} />) if you want to insert the return value of this component into a DOM element manually, where you `import { insert } from "solid-js/web";` because we first want to insert the image once it has loaded.
 */
export function ShopifyResponsiveImg(
  props: {
    resolutions?: number[];
    /**
     * Width of the container, we'll load an image with that width
     */
    size: Accessor<number>;
    /**
     * Height of the container, if set we will use this to still load sharp images even when object-fit is set to "cover", and the image is "zoomed" in on the x-axis.
     */
    sizeHeight?: Accessor<number>;
    src: string;
    /**
     * When image is not lazy loaded this callback will be called every time the image has been decoded
     */
    onDecoded?: VoidFunction;
    loading?: "eager" | "lazy" | "force-lazy";
    customUrls?: (url: string, width: number) => string;
    /**
     * When `true`, data written for ShopifyContainedImage's `autoAdjustAspectRatio` feature will only be allowed to be written the load after the image src has changed. This is to make css transitions on images whose size is animated smoother (since aspect ratio changing minimally as size changes will cause the transition to restart)
     */
    keyRatioUpdating?: boolean;
  } & Omit<JSX.ImgHTMLAttributes<HTMLImageElement>, "srcset" | "src" | "sizes" | "loading">
) {
  const img = new Image(); // Need to use new Image or browser might not start loading image before it's in the DOM
  const [ourRatioKeyed, setOurRatioKeyed] = createSignal<number | undefined>();
  const [rAFSinceReturned, setRAFSinceReturned] = createSignal(false);
  const sizeToUse = createMemo(() => {
    // We first put the images into the DOM after they have been decoded. We can only get the correct object-fit value after the image is in the DOM.
    // To avoid using an observer for knowing when the image is in the DOM (one of the most CPU intensive things when we did lighthouse optimisation) we just re-check an animationframe after we told <Show> to show the image, which seems to work reliably
    rAFSinceReturned();
    // props.size could be a getter that expects a cleanup so get it in this memo instead of where we set img.sizes (also we need to multiply, and it's good with some diffing here so people calling the comp don't have to)
    const incomingSize = props.size();
    const ratio = ourRatioKeyed();
    const containerHeight = props.sizeHeight?.();
    if (!incomingSize || !ratio || !containerHeight || getComputedStyle(img).objectFit !== "cover") return incomingSize;
    const maybeCorrectedSize = ratio * containerHeight;
    return Math.round(Math.max(incomingSize, maybeCorrectedSize));
  });
  const src_options = createMemo(() => {
    const { src, customUrls } = props;
    const fallback_src = (customUrls || generateShopifyImageUrl)(src, 400);
    const srcset = make_srcset(
      props.src,
      props.resolutions || [64, 128, 256, 300, 400, 512, 640, 768, 1024, 1280, 1536, 2048, 2560, 3072, 3584, 4096],
      customUrls
    );

    // The order here *might* matter - I've seen mobile safari always start with loading the 400px version when it was reversed
    return { srcset, src: fallback_src };
  });

  // Work around https://github.com/solidjs/solid/issues/1828
  const [, otherAttributes] = splitProps(props, [
    "resolutions",
    "size",
    "src",
    "srcSet",
    "loading",
    "keyRatioUpdating",
    "sizeHeight",
    "onDecoded",
    "customUrls", // Can't have properties ending on underscore because the property name mangling will get confused by this <-
  ]);
  const [hasSetSize, setHasSetSize] = createSignal(false);
  const [hasDecoded, setHasDecoded] = createSignal(false);
  const productCardIndexAccessor = useProductCardIndex();
  const listingContext = useListing();
  const isPrioritisedImage = createMemo(() => (productCardIndexAccessor?.() as number) < 8);
  const shouldActuallyEnableLazyLoading = createMemo(() => {
    const { loading } = props;
    if (loading === "force-lazy") return true;
    return loading === "lazy" && !isPrioritisedImage();
  });
  const modifiedOtherAttributes = mergeProps(otherAttributes, {
    get loading() {
      return shouldActuallyEnableLazyLoading() ? ("lazy" as const) : undefined;
    },
  });
  // Batch idle callbacks so that MutationObserver can batch the resulting mutations better, so we don't lose tons of CPU time to MutationObservers doing lots of things for each image
  // Happened on singular, they have some weird observer (+we also have one but ours is at least 3x more efficient)
  const executeWhenIdleBatched = (fn: () => any, isSizesUpdate: boolean) => {
    if (typeof requestIdleCallback !== "function") return setTimeout(fn); // Old browsers don't get optimisation
    if ((!isSizesUpdate || !sizeSetFastPath) && untrack(isPrioritisedImage)) return fn(); // If we're one of the first 8 images, execute the callbacks immediately (improves lighthouse metrics)
    // unless we're just a `sizes` update after the initial sizes setting (this optimisation makes the looks animation a lot smoother on low-cpu devices)
    const existingStack = listingContext?.[onIdleFunctionsSymbol] as Set<() => any> | undefined;
    if (existingStack) {
      return existingStack.add(fn);
    }
    const newStack = new Set([fn]);
    if (listingContext) listingContext[onIdleFunctionsSymbol] = newStack;
    const processStackWhenIdle = () =>
      requestIdleCallbackWithDynamicTimeout(
        catchify(deadline => {
          const start = performance.now();
          const thirdDeadlineTime = deadline.timeRemaining() / 3; // observers coming after this take up 2-3x the time so don't use all of it
          for (const fn of newStack) {
            newStack.delete(fn);
            fn();
            const timeTaken = performance.now() - start;
            if ((!deadline.timeRemaining() || timeTaken > thirdDeadlineTime) && newStack.size) {
              // There's still work to be done but no time, so schedule another idle callback
              processStackWhenIdle();
              return;
            }
          }
          // Stack is empty
          if (listingContext) delete listingContext[onIdleFunctionsSymbol];
        })
      );
    processStackWhenIdle();
  };
  let sizeSetFastPath = false;
  let hasDecodedFastPath = false;
  let timeoutSet = false;
  let gotCleanedUp = false;
  let srcJustChanged = true;

  img.classList.add("s-responsive-image");
  if (listingContext) {
    let prevValue: { aspectRatio_: number } | undefined;
    const aspectRatios = (listingContext[listingContextAspectRatiosSymbol] ||= new Set()) as AspectRatiosSet;
    const [, setMostPrevalentAspectRatio] = (listingContext[listingContextMostPrevalentAspectRatioSymbol] ||=
      createSignal()) as MostPrevalentAspectRatio;
    img.addEventListener(
      "load",
      catchify(() => {
        const aspectRatio_ = img.naturalWidth / img.naturalHeight;
        if (srcJustChanged) {
          // Always key object-fit-cover compensation to one src, to avoid loading-different-images-infinite-loop
          setOurRatioKeyed(aspectRatio_);
        } else if (props.keyRatioUpdating) {
          return;
        }
        srcJustChanged = false;

        // Save our aspect ratio whenever it changes, so that we can base the containers on the most dominant aspect ratio, used in SearchModalV2 and LookItem
        if (prevValue) aspectRatios.delete(prevValue);
        const newValue = !isNaN(aspectRatio_) ? { aspectRatio_ } : undefined;
        if (newValue) aspectRatios.add(newValue);
        prevValue = newValue;
        // Do all calculations resulting of an update directly, for performance
        const asArray = [...aspectRatios].map(({ aspectRatio_ }) => aspectRatio_);
        const mostPrevalentAspectRatio = findMostFrequentItem(asArray);
        setMostPrevalentAspectRatio(mostPrevalentAspectRatio);
      })
    );
    onCleanup(() => prevValue && aspectRatios.delete(prevValue));
  }

  onCleanup(() => (gotCleanedUp = true));

  spread(img, mergeProps(modifiedOtherAttributes), false, true);

  createRenderEffect(() => {
    props.src;
    srcJustChanged = true;
  });

  createEffect(() => {
    if (!sizeToUse()) return; // wait until we have a size, run every time the size changes
    if (timeoutSet) return;
    const handler = catchify(() => {
      if (gotCleanedUp) return;
      img.sizes = `${sizeToUse()}px`; // use latest available value of size in case it has changed
      if (!sizeSetFastPath) {
        setHasSetSize(true);
        sizeSetFastPath = true;
      }
      timeoutSet = false;
    });
    // Throttle the updating of sizes to avoid unnecessary image re-fetches during resize
    // And also because we first set src after sizes has been set, wait with loading and decoding images until browser is idle
    // This greatly improves performance when loading (more) products
    // See https://depictaiworkspace.slack.com/archives/C05NJ0K3WRL/p1698220617663139
    timeoutSet = true; // Important to set timeoutSet before the call to executeWhenIdleBatched since if this is an important image executeWhenIdleBatched will execute fn immediately
    executeWhenIdleBatched(handler, true);
  });

  const dontLoadImageYet = createMemo(() => !sizeToUse() || !hasSetSize()); // Moving this condition into a memo saves us from re-setting src and srcset (expensive) if just props.size changes
  createEffect(() => {
    if (dontLoadImageYet()) return; // If size isn't known or set, don't assign src yet since it would cause the most low res image to load
    Object.assign(img, src_options());

    // Add to DOM once decoded to not require/block any paints before image has completed loading and avoid showing broken image symbol
    // We can do this because there has to be a container around us giving us a size

    // No need to listen if we're already in the DOM
    if (hasDecodedFastPath) return;

    if (shouldActuallyEnableLazyLoading()) {
      // For lazy loading there's no decoding to wait for as it only occurs when the image is visible
      // Make sure src is set before we put the image into the DOM though so no broken image symbol is shown
      setHasDecoded(true);
      hasDecodedFastPath = true;
      return;
    }

    img
      .decode()
      .catch(e => dwarn("Failed to decode image", e, img))
      // Display the image also if loading failed so webdev can debug and doesn't get "no image"
      .then(async () => {
        // Also wait with inserting image (i.e. paint) until browser is idle
        await new Promise<void>(r => executeWhenIdleBatched(r, false));
        if (gotCleanedUp) return;
        setHasDecoded(true);
        hasDecodedFastPath = true;
        props.onDecoded?.();
      });
  });

  createEffect(() => hasDecoded() && requestAnimationFrame(catchify(() => setRAFSinceReturned(prev => !prev))));

  return <Show when={hasDecoded()}>{img}</Show>;
}

function make_srcset(
  url: string,
  resolutions: number[],
  customGenerateImageUrl_?: (url: string, width: number) => string
) {
  return resolutions
    .map(width => `${(customGenerateImageUrl_ || generateShopifyImageUrl)(url, width)} ${width}w`)
    .join(", ");
}

export function generateShopifyImageUrl(url: string, width: number) {
  // Even just creating one `URL` object per image src and then setting the search parameter is quite slow (0.25ms to set the width param)
  // We're making the assumptions that the url has already at least one query parameter and that the image resizing service will choose the last one out of a duplicate width parameter (shopify's does)
  // That way we can just to string concatenation which is insanely fast
  return url + "&width=" + encodeURIComponent(width);
}
