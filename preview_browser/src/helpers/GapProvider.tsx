/** @jsxImportSource solid-js */
import { Accessor, createContext, createMemo, JSX as solid_JSX, useContext } from "solid-js";
import { media_query_to_accessor } from "@depict-ai/ui/latest";

const GapContext = /*@__PURE__*/ createContext<Accessor<string>>();

export function GapProvider(props: { children: solid_JSX.Element }) {
  const isLarge = media_query_to_accessor("(min-width: 1025px)");
  const gap = createMemo(() => (isLarge() ? "1%" : "2%"));
  return <GapContext.Provider value={gap}>{props.children}</GapContext.Provider>;
}

/**
 * Use this to get the context object if your component is within a ListingProvider
 */
export function useGap() {
  return useContext(GapContext)!;
}
