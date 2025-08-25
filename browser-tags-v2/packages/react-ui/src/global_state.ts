import { DPC } from "@depict-ai/dpc";
import {
  ClassicSearchModal,
  DepictAPI,
  DepictCategory,
  DepictSearch,
  OnNavigation,
  SearchModalV2,
} from "@depict-ai/ui";
import { createSignal, Signal } from "solid-js";
import { defaultLocale, Locale } from "@depict-ai/ui/locales";

export interface GlobalState {
  // TODO: save a way after provider has been initialised to create new instances
  search_instances: Map<string | undefined, { instance: DepictSearch<any>; dispose?: VoidFunction; users: number }>;
  category_instances: Map<string | undefined, { instance: DepictCategory<any>; dispose?: VoidFunction; users: number }>;
  api: DepictAPI<any> | null;
  dpc: DPC | null;
  merchant: Signal<string | undefined>;
  market: Signal<string | undefined>;
  sessionId: Signal<string | undefined>;
  metaData?: Record<string, string>;
  known_category_paths: Set<string>;
  search_page_path_: Signal<string | undefined>;
  search_page_in_dom: Signal<boolean>;
  category_page_in_dom: Signal<boolean>;
  usedLocale: Signal<Locale>;
  search_query_url_param_name?: string;
  enableCategorySuggestions?: boolean;
  enable_content_search: Signal<boolean | undefined>;
  on_navigation?: Exclude<OnNavigation, "hard_navigation">;
  provider_is_updating: Signal<boolean>;
  disable_override_listing_id: Signal<boolean | undefined>;
  searchModalComponent_?: typeof SearchModalV2<any, any> | typeof ClassicSearchModal;
}

export const globalState: GlobalState = {
  usedLocale: createSignal(defaultLocale),
  search_instances: new Map(),
  category_instances: new Map(),
  api: null,
  dpc: null,
  merchant: createSignal(),
  market: createSignal(),
  sessionId: createSignal(),
  known_category_paths: new Set(),
  search_page_path_: createSignal(),
  search_page_in_dom: createSignal(false),
  category_page_in_dom: createSignal(false),
  provider_is_updating: createSignal(false),
  enable_content_search: createSignal(),
  disable_override_listing_id: createSignal(),
};
