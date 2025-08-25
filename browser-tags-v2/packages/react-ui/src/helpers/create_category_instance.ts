import { globalState } from "../global_state";
import { createComputed, createRoot, untrack } from "solid-js";
import { DepictCategory } from "@depict-ai/ui";

/**
 * Instantiates a DepictCategory instance and sets up the reactive parts of it to follow globalState.
 * @param disposable Whether or not the instance should be created along with a dispose function that can be used to dispose it
 */
export function create_category_instance(disposable: boolean, stateKey?: string) {
  const actual_function = (dispose?: VoidFunction) => {
    const {
      usedLocale: [get_locale],
      merchant: [get_merchant],
      market: [get_market],
      disable_override_listing_id: [get_disable_override_listing_id],
    } = globalState;

    const instance = new DepictCategory({
      api: globalState.api!,
      market: untrack(get_market)!, // TODO: check if we can do this
      merchant: untrack(get_merchant)!,
      localization: untrack(get_locale),
      on_navigation: (...args) => globalState.on_navigation!(...args), // wrapping the function here since it could change
      unique_instance_key_for_state: stateKey,
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
    createComputed(() => (instance.disable_override_listing_id = get_disable_override_listing_id()));

    return { instance, dispose, users: 0 };
  };
  const function_length_0 = () => actual_function();
  const function_length_1 = (dispose: VoidFunction) => actual_function(dispose);
  return createRoot(disposable ? function_length_1 : function_length_0); // solid-js creates roots differently based on if it can detect a dispose argument, with function.length. That's why this is written like this
}
