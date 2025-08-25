import { JSX as solid_JSX } from "solid-js";

export interface Styles {
  [selector: string]: solid_JSX.CSSProperties;
}

export const css_properties_to_valid_css_string = (css_properties: solid_JSX.CSSProperties): string => {
  return Object.entries(css_properties)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ");
};

export const styles_to_valid_css_string = (styles: Styles): string => {
  return Object.entries(styles)
    .map(([selector, css_properties]) => `${selector} { ${css_properties_to_valid_css_string(css_properties)} }`)
    .join(" ");
};
