/** @jsxImportSource solid-js */

import { JSX as solid_JSX } from "solid-js";

/**
 * Base placeholder component used by ImagePlaceholder and TextPlaceholder
 */
export function BasePlaceholder(props: { style: solid_JSX.CSSProperties; class?: string }) {
  // Work around https://github.com/solidjs/solid/issues/1980
  return <span class={props.class} classList={{ "depict-placeholder": true }} style={props.style}></span>;
}
