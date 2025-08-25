import {
  ImagePlaceholder as OriginalImagePlaceholder,
  TextPlaceholder as OriginalTextPlaceholder,
} from "@depict-ai/ui";

/**
 * A Placeholder to use instead of some text, while it's loading. This is the inline version, meant to be embedded into sentences (or exist instead of them), etc.
 * If you want a block version, use `ImagePlaceholder` with `width`and `height` set instead.
 * @property height height of the placeholder. Set to `1em` by default.
 * @property width width of the placeholder. For specific number of characters use `ch`, ex: `width="7ch"`
 * @property class extra classes to add to the placeholder
 * @property style extra styles to add to the placeholder
 */
export function TextPlaceholder(options: Parameters<typeof OriginalTextPlaceholder>[0]): HTMLElement {
  return OriginalTextPlaceholder(options) as HTMLElement;
}

/**
 * A placeholder that can be used instead of an image or other block of content while it's loading.
 * The placeholder has `display:block`, meaning it will create a new "row" in the layout for itself. Can be used either for images with a defined aspect ratio (ContainedImage) or blocks.
 * @property aspectRatio if aspectRatio is defined the placeholder will be in "image mode" and fill out the available width and then adjust the height according to the aspectRatio
 * @property width If width and height is set, the defined width and height will be used.
 * @property height If width and height is set, the defined width and height will be used.
 * @property class extra classes to add to the placeholder
 * @property style extra styles to add to the placeholder
 */
export function ImagePlaceholder(options: Parameters<typeof OriginalImagePlaceholder>[0]): HTMLElement {
  return OriginalImagePlaceholder(options) as HTMLElement;
}
