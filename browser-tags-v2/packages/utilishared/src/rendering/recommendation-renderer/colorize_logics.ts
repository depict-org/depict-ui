import { Display, Node_Array } from "./types";

export const should_colorizeLogics =
  typeof window === "undefined" ? false : /*@__PURE__*/ localStorage.getItem("colorize-logics") === "true";

export function colorize_elements(elements: NodeListOf<ChildNode> | Node_Array, display: Display) {
  elements.forEach((elem: HTMLElement | Element | Node) => {
    if (elem.nodeType !== Node.TEXT_NODE) {
      // calc a hash for given string
      const hc = (str = "") => {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
          const chr = str.charCodeAt(i);
          hash = (hash << 5) - hash + chr;
          hash |= 0;
        }
        return hash;
      };
      const hash = hc(display.logic);
      // Change hue based on hash
      const color = "hsl(" + (hash % 360) + ",100%,75%)";

      if ("style" in elem) {
        elem.style.background = color;
      }

      // @ts-ignore
      elem?.setAttribute?.("data-logic", display.logic);
      // @ts-ignore
      elem?.setAttribute?.("title", "Logic: " + display.logic);
    }
  });

  return elements;
}
