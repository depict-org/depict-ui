/* @refresh reload */
import { JSX } from "solid-js";

/**
 * ImageContainer for using the padding hack to set the aspect ratio of an image
 * Put this around an <img> or <ResponsiveImg> to give it a container that always has the same size as the image. This prevents CLS and enables ResponsiveImg to work (the browser to load the correct image size)
 * (Not using the CSS aspect-ratio property yet here due to browser support)
 */

export function ImageContainer(props: { aspectRatio: number | string; class?: string; children?: JSX.Element }) {
  return (
    <div
      style={`padding-bottom:calc(calc(1 / ${props.aspectRatio}) * 100%)`}
      // Work around https://github.com/solidjs/solid/issues/2050
      class={"s-image-container" + (props.class ? " " + props.class : "")}
    >
      {props.children}
    </div>
  ) as HTMLDivElement;
}
