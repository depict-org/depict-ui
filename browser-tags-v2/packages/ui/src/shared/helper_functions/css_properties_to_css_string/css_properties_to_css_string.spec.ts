import { JSX as solid_JSX } from "solid-js";
import { css_properties_to_valid_css_string, Styles, styles_to_valid_css_string } from "./css_properties_to_css_string";

describe("CSS properties to JSX style", () => {
  it("should transform CSS properties to valid CSS string", () => {
    const css_properties: solid_JSX.CSSProperties = {
      "height": "100%",
      "border-radius": "5px",
      "z-index": "calc(1000 + 1)",
    };

    expect(css_properties_to_valid_css_string(css_properties)).toEqual(
      "height: 100%; border-radius: 5px; z-index: calc(1000 + 1);"
    );
  });

  it("should transform Styles to valid CSS string", () => {
    const style1: solid_JSX.CSSProperties = {
      "height": "100%",
      "border-radius": "5px",
      "z-index": "calc(1000 + 1)",
    };

    const style2: solid_JSX.CSSProperties = {
      "height": "100%",
      "border-radius": "5px",
      "z-index": "calc(1000 + 1)",
    };

    const styles: Styles = {
      ".class": style1,
      ".class2": style2,
    };

    expect(styles_to_valid_css_string(styles)).toEqual(
      ".class { height: 100%; border-radius: 5px; z-index: calc(1000 + 1); } .class2 { height: 100%; border-radius: 5px; z-index: calc(1000 + 1); }"
    );
  });
});
