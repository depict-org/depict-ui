import { Accessor, createContext } from "solid-js";
import { DepictCategory, DepictSearch } from "@depict-ai/ui/latest";

// Needs to be in separate module from useTopLevelContext so the context symbol doesn't change when HMR updating setup_depict_category or setup_depict_search
export const TopLevelContext = /*@__PURE__*/ createContext<{
  depict_search: DepictSearch<any, any>;
  depict_category: DepictCategory<any, any>;
  is_actually_routing: Accessor<boolean>;
}>();
