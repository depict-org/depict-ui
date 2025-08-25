import { Accessor, createEffect, createSignal, getOwner, onCleanup, runWithOwner } from "solid-js";
import { useListing } from "../../helper_functions/ListingContext";
import { ImageContainer } from "./ImageContainer";
import {
  listingContextMostPrevalentAspectRatioSymbol,
  MostPrevalentAspectRatio,
  ShopifyResponsiveImg,
} from "./ResponsiveImg";
import { queueMacroTask } from "@depict-ai/utilishared";
import { insert } from "solid-js/web";
import { aspectRatioOverrideCssVariableName } from "../../../search/components/DefaultInstantCardPlaceholder";
import { makeSizeAccessors } from "./makeSizeAccessors";

const backupSizeSignal = /*@__PURE__*/ createSignal<[Accessor<number>, Accessor<number>] | undefined>();
export const shopifyContainedImageContextSymbol = /*@__PURE__*/ Symbol("ShopifyContainedImage");

/**
 * Abstraction built on top of ShopifyResponsiveImg. This is your one-stop-shop If you just need a responsive image.
 * Will return a div of the provided aspect ratio that always has the same size, to avoid content layout shift. Will then put the image inside of the container once it loads.
 * Also makes a responsive image without you having to do anything: uses shopify's CDN which picks the best image format to resize the image to the size of the first image container in a certain listing.
 * This works because the listings (recs, search, plp) all are wrapped in `<ListingProvider>`'s. This means all components rendered within can use `useListing` to get an object to write data to that will be the same for all components rendered within that listing. The first instance of this component rendered within a listing puts a ResizeObserver on its div and the other components then just set the sizes attribute of their image to that.
 * @property src image source
 * @property aspectRatio aspect ratio of the image
 * @property class extra class to add to the container
 * @property alt alt text for the image
 * @property autoAdjustAspectRatio whether to automatically adjust the aspect ratio of the image to the majority of the aspect ratios of loaded images in the current listing provider. Defaults to false. Can be overriden with css variable --image-aspect-ratio.
 * @property imgProps props to pass to ShopifyResponsiveImg to add to the <img> element
 */
export function ShopifyContainedImage(props: {
  src: string;
  aspectRatio: number | string;
  autoAdjustAspectRatio?: boolean;
  class?: string;
  imgProps?: Omit<Parameters<typeof ShopifyResponsiveImg>[0], "size" | "src">;
}) {
  const context = useListing();
  if (context && !context[shopifyContainedImageContextSymbol]) {
    // create a signal that's the same for all items in this listing
    context[shopifyContainedImageContextSymbol] = createSignal<[Accessor<number>, Accessor<number>] | undefined>();
  }
  const [currentImageSize, setCurrentImageSize] =
    (context?.[shopifyContainedImageContextSymbol] as typeof backupSizeSignal) || backupSizeSignal; // use global fallback signal (might lead to blurry images) if no context is available
  const [mostPrevalentAspectRatio] = context
    ? // If the context exists we have to create the signal here as getting it here would be too late when it's created by ShopifyResponsiveImg below
      ((context[listingContextMostPrevalentAspectRatioSymbol] ||= createSignal()) as MostPrevalentAspectRatio)
    : [];
  const container = ImageContainer({
    // Write getters manually instead of using JSX, so we can do more complex logic in the aspectRatio getter without increasing bundle size
    get class() {
      return props.class;
    },
    get aspectRatio() {
      if (props.autoAdjustAspectRatio) {
        const targetRatio = mostPrevalentAspectRatio?.();
        if (targetRatio != undefined) {
          return `var(${aspectRatioOverrideCssVariableName}, ${targetRatio})`;
        }
      }
      return props.aspectRatio;
    },
  });
  const owner = getOwner()!;
  let createdSizeAccessor = false;
  let wasCleanedUp = false;

  createEffect(() => {
    if (currentImageSize() || wasCleanedUp) return; // We get into the effect when onCleanup is called if we don't have wasCleanedUp
    // ensure we always have a size accessor
    // what this whole thing does is set the sizes attribute to the actual size of one of the existing image containers, therefore the value doesn't have to manually be specified
    createdSizeAccessor = true;
    setCurrentImageSize(() => runWithOwner(owner, () => makeSizeAccessors(container)));
  });
  onCleanup(() => {
    wasCleanedUp = true; // important to set this before the function call below and always, so the dead effects don't create dead size accessors
    if (!createdSizeAccessor) return;
    queueMacroTask(() => setCurrentImageSize()); // unset the size accessor next event loop iteration, so that all onCleanup's have time to run, since the effects run more aggressively and can create a size accessor with a cleaned up owner otherwise
  });

  insert(
    container,
    <ShopifyResponsiveImg
      size={() => currentImageSize()?.[0]?.() || 0}
      sizeHeight={() => currentImageSize()?.[1]?.() || 0}
      src={props.src}
      {...props.imgProps}
      style={props.imgProps?.style}
    />
  );

  return container;
}
