/** @jsxImportSource solid-js */
import {
  Styles,
  styles_to_valid_css_string,
} from "../../helper_functions/css_properties_to_css_string/css_properties_to_css_string";
import { createMemo, JSX as solid_JSX } from "solid-js";
import { Accessor } from "solid-js/types";

interface Props {
  styles: Accessor<Styles>;
}

/** Transform your solid_JSX.CSSProperties into valid CSS styling */
export function JsxStyle(props: Props) {
  const valid_css_string = createMemo(() => {
    return styles_to_valid_css_string(props.styles());
  });

  return <style>{valid_css_string as unknown as solid_JSX.Element}</style>;
}
