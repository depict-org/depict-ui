import { enableFeedLayout } from "./enableFeedLayout";
import { LookCard } from "../../../shared/components/Looks/LookCard";

export type LooksPlugin = {
  categoryPageHook_: typeof enableFeedLayout;
  looksProductCardTemplate_: typeof LookCard;
};
