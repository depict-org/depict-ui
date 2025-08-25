/** @jsxImportSource solid-js */
import { BasePlaceholder } from "./BasePlaceholder";
import { createMemo, JSX as solid_JSX } from "solid-js";

/**
 * A Placeholder to use instead of some text, while it's loading. This is the inline version, meant to be embedded into sentences (or exist instead of them), etc.
 * If you want a block version, use `ImagePlaceholder` with `width`and `height` set instead.
 * @property height height of the placeholder. Set to `1em` by default.
 * @property width width of the placeholder. For specific number of characters use `ch`, ex: `width="7ch"`
 * @property class extra classes to add to the placeholder
 * @property style extra styles to add to the placeholder
 */
export function TextPlaceholder(props: {
  style?: solid_JSX.CSSProperties;
  height: string;
  width: string;
  class?: string;
}) {
  const style = createMemo<solid_JSX.CSSProperties>(() => {
    const { style, height, width } = props;

    return {
      ...(style || {}),
      height: height ?? "1em",
      ...(width && { width }),
    };
  });
  return <BasePlaceholder style={style()} class={props.class} />;
}
