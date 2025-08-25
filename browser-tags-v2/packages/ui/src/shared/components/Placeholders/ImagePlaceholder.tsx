/* @refresh reload */
import { createMemo, JSX as solid_JSX } from "solid-js";
import { BasePlaceholder } from "./BasePlaceholder";

type ImagePlaceholderBaseOptions = { style?: solid_JSX.CSSProperties; class?: string };

type ImagePlaceholderBlockOptions = {
  width: string;
  height: string;
};

type ImagePlaceholderImageOptions = {
  aspectRatio: number | string;
};

/**
 * A placeholder that can be used instead of an image or other block of content while it's loading.
 * The placeholder has `display:block`, meaning it will create a new "row" in the layout for itself. Can be used either for images with a defined aspect ratio (ContainedImage) or blocks.
 * @property aspectRatio if aspectRatio is defined the placeholder will be in "image mode" and fill out the available width and then adjust the height according to the aspectRatio
 * @property width If width and height is set, the defined width and height will be used.
 * @property height If width and height is set, the defined width and height will be used.
 * @property class extra classes to add to the placeholder
 * @property style extra styles to add to the placeholder
 */
export function ImagePlaceholder(
  props: ImagePlaceholderBaseOptions & (ImagePlaceholderBlockOptions | ImagePlaceholderImageOptions)
) {
  const style = createMemo<solid_JSX.CSSProperties>(() => {
    const { style, height, width, aspectRatio } = props as ImagePlaceholderBaseOptions &
      Partial<ImagePlaceholderBlockOptions> &
      Partial<ImagePlaceholderImageOptions>;

    const is_image = aspectRatio != undefined;

    const size_data = is_image
      ? ({
          width: "100%",
          "padding-bottom": `calc(calc(1 / ${aspectRatio}) * 100%)`,
        } as const)
      : { width: width, height: height };

    return {
      display: "block",
      ...(style || {}),
      ...size_data,
    };
  });
  return <BasePlaceholder style={style()} class={props.class} />;
}
