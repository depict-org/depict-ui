/** @jsxImportSource solid-js */
import { Accessor, createContext, JSX as solid_JSX, useContext } from "solid-js";

const ProductCardIndexContext = /*@__PURE__*/ createContext<Accessor<number>>();

/**
 * Provider to wrap every product card that gets rendered in (in PLPResults rendering internals), enables using useProductCardIndex anywhere inside the product card to get the index of the product card.
 */
export function ProductCardIndexProvider(props: { children: solid_JSX.Element; index_: Accessor<number> }) {
  return <ProductCardIndexContext.Provider value={props.index_}>{props.children}</ProductCardIndexContext.Provider>;
}

/**
 * Use this to get an accessor containing the index of your product card.
 */
export function useProductCardIndex() {
  return useContext(ProductCardIndexContext);
}
