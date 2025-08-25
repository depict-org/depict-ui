import { JSX, useContext } from "solid-js";
import { setup_depict_search } from "~/helpers/setup_depict_search";
import { setup_depict_category } from "~/helpers/setup_depict_category";
import { use_is_actually_routing } from "~/helpers/use_is_actually_routing";
import { TopLevelContext } from "./TopLevelContext";

/**
 * Sets up some top level context that is used by many components across all pages. The entire app should be wrapped in this.
 */
export function ToplevelContextProvider(props: { children: JSX.Element }) {
  const depict_search = setup_depict_search();
  const depict_category = setup_depict_category();
  const is_actually_routing = use_is_actually_routing();

  return (
    <TopLevelContext.Provider value={{ depict_category, depict_search, is_actually_routing }}>
      {props.children}
    </TopLevelContext.Provider>
  );
}

/**
 * Returns some top level context that is used by many components across all pages. The entire app should be wrapped in <ToplevelContextProvider>.
 */
export function useTopLevelContext() {
  return useContext(TopLevelContext);
}
