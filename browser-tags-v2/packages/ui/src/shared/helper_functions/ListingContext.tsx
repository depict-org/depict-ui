/** @jsxImportSource solid-js */
import { createContext, JSX as solid_JSX, useContext } from "solid-js";

const ListingContext = /*@__PURE__*/ createContext<Record<symbol, any>>();

/**
 * Provider to wrap every listing (group of products) in
 * Used for example for deduplicating ResizeObservers for responsive images
 */
export function ListingProvider(props: { children: solid_JSX.Element }) {
  const our_object: Record<symbol, any> = {};
  return <ListingContext.Provider value={our_object}>{props.children}</ListingContext.Provider>;
}

/**
 * Use this to get the context object if your component is within a ListingProvider
 */
export function useListing() {
  return useContext(ListingContext);
}
