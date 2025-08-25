/** @jsxImportSource solid-js */
import { insert } from "solid-js/web";
import { JSX as solid_JSX } from "solid-js";
import { useExpandingContainer } from "@depict-ai/utilishared";

/**
 * Just like `useExpandingContainer` except that the children can be reactive solid-js signals, basically solid's JSX.Element instead of our JSX.Element
 */
export function useExpandingContainerReactive(...params: Parameters<typeof useExpandingContainer>) {
  const { collapse, expand, ExpandingContainer } = useExpandingContainer(...params);

  return {
    collapse,
    expand,
    ExpandingContainer: ({ children }: { children: solid_JSX.Element | (() => solid_JSX.Element) }) => {
      // get reactive signals/solid's jsx elements into `ExpandingContainer`
      const fake_div = document.createElement("div");
      const outer_expanding = <ExpandingContainer>{[fake_div]}</ExpandingContainer>;
      const parent = fake_div.parentElement!;
      fake_div.remove();
      insert(parent, children);
      return outer_expanding;
    },
  };
}
