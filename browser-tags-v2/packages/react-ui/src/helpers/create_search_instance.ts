import { DepictSearch, SearchModalV2 } from "@depict-ai/ui";
import { createComputed, createRoot, untrack } from "solid-js";
import { globalState } from "../global_state";

export function create_search_instance(disposable: boolean, stateKey?: string) {
  const actual_function = (dispose?: VoidFunction) => {
    const {
      usedLocale: [get_locale],
      merchant: [get_merchant],
      market: [get_market],
      search_query_url_param_name,
      search_page_path_: [get_search_page_path],
      enable_content_search: [get_enable_content_search],
    } = globalState;

    const instance = new DepictSearch({
      api: globalState.api!,
      search_query_url_param_name,
      market: untrack(get_market)!, // TODO: check if we can do this
      merchant: untrack(get_merchant)!,
      enable_category_suggestions: globalState.enableCategorySuggestions ?? false, // default category suggestions to false for @depict-ai/react-ui (https://linear.app/depictai/issue/FRO-401/default-enablecategorysuggestions-to-false)
      localization: untrack(get_locale),
      url_transformer: url => (url.pathname = untrack(get_search_page_path)!),
      on_navigation: (...args) => globalState.on_navigation!(...args), // wrapping the function here since it could change
      unique_instance_key_for_state: stateKey,
      enable_content_search: untrack(get_enable_content_search),
      searchModalComponent:
        globalState.searchModalComponent_ ||
        ((process.env.NO_SEARCH_MODAL_DEFAULT === "true" ? undefined : SearchModalV2) as typeof SearchModalV2),
    });

    createComputed(() => {
      const new_merchant = get_merchant();
      if (new_merchant) instance.merchant = new_merchant;
    });
    createComputed(() => {
      const new_market = get_market();
      if (new_market) instance.market = new_market;
    });
    createComputed(() => (instance.localization = get_locale()));
    createComputed(() => (instance.enable_content_search = get_enable_content_search()));

    return { instance, dispose, users: 0 };
  };
  const function_length_0 = () => actual_function();
  const function_length_1 = (dispose: VoidFunction) => actual_function(dispose);
  return createRoot(disposable ? function_length_1 : function_length_0); // solid-js creates roots differently based on if it can detect a dispose argument, with function.length. That's why this is written like this
}
