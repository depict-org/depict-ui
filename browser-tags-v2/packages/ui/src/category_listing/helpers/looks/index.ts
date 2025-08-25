import { LooksPlugin } from "./types";
import { enableFeedLayout } from "./enableFeedLayout";
import { LookCard } from "../../../shared/components/Looks/LookCard";

export const looksPlugin: LooksPlugin = {
  categoryPageHook_: enableFeedLayout,
  looksProductCardTemplate_: LookCard,
};
