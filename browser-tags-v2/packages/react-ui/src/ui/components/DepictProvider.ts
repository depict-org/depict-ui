import { untrack } from "solid-js";
import { createElement, Fragment, PropsWithChildren, useEffect } from "react";
import {
  BaseCategoryProviderConfig as CategoryProviderConfig,
  BaseProviderConfig,
  BaseSearchProviderConfig as SearchProviderConfig,
  DepictAPI,
  ModernDisplayWithPageUrl,
  OnNavigation,
} from "@depict-ai/ui";
import { defaultLocale, Locale } from "@depict-ai/ui/locales";
import { nextScrollRestorationFix } from "../../nextScrollRestorationFix";
import { globalState } from "../../global_state";
import { defaultNavigation } from "../../navigation/default";
import { setup_performance_client } from "../hooks/usePerformanceClient/usePerformanceClient";
import { Display, ModernDisplay } from "@depict-ai/utilishared";
import { create_search_instance } from "../../helpers/create_search_instance";
import { create_category_instance } from "../../helpers/create_category_instance";

let provider_instances = 0;

/**
 * relativeUrl: The relative url to navigate to.
 * replace: Whether to replace the current url or push a new one.
 */
export type NavigateFunction = (relativeUrl: string, options: { replace: boolean; scroll: boolean }) => void;

/**
 * The config for the DepictProvider.
 */
export type ProviderConfig<
  OriginalDisplay extends Display,
  OutputDisplay extends ModernDisplay | never,
> = BaseProviderConfig<OriginalDisplay, OutputDisplay> & {
  /**
   * The function to use for navigating to a new page.
   * This function will be used internally by our components to navigate.
   *
   * You don't need to provide any in a Next.js context.
   *
   * @param relativeUrl - The relative url to navigate to.
   *
   * @example
   * Here is how you would use it with react-router, @reach/router, Gatsby or similar.
   * ```tsx
   * import { DepictProvider, Navigation } from "@depict-ai/react-ui";
   * import { useNavigate } from "react-router-dom";
   * // import { navigate } from "gatsby";
   *
   * function Router() {
   *   const navigate = useNavigate();
   *   return (
   *     <DepictProvider
   *       merchant="houdini"
   *       market="en-de"
   *       navigateFunction={navigate}
   *       search={{
   *         searchPagePath: "/search",
   *       }}
   *     >
   *       <Routes>[...]</Routes>
   *     </DepictProvider>
   *   );
   * }
   * ```
   * @example
   * If you're using another library, you can define your own navigate function, that's compatible with the `NavigateFunction` type.
   * ```tsx
   * const navigateFunction = (relativeUrl: string, { replace }) => {
   *  router.push(relativeUrl, { replace });
   * };
   * ```
   */
  navigateFunction?: NavigateFunction;
  /**
   * The locale to use for the Depict components as well as Depict results.
   */
  locale: Locale;

  /**
   * Options that are required for search functionality.
   */
  search?: SearchProviderConfig<OriginalDisplay, OutputDisplay>;

  /**
   * Options that can be used for category page functionality.
   */
  category?: CategoryProviderConfig;
};
/**
 * The DepictProvider is a wrapper component that should be used to wrap any component that uses Depict components.
 *
 * Make sure it's mounted on every page where the search modal should be available.
 *
 * @param props -  The props for the DepictProvider.
 *
 * @example
 * ```tsx
 *  const App = () => { *
 *    return (
 *      <DepictProvider
 *        merchant="YOUR_MERCHANT"
 *        market="YOUR_MARKET"
 *        search={{
 *          searchPagePath: "/search",
 *        }}
 *      >
 *        <App />
 *      </DepictProvider>
 *    );
 * };
 * ```
 * @returns {JSX.Element} The DepictProvider.
 */
export function DepictProvider<
  InputDisplay extends Display,
  OutputDisplay extends ModernDisplay | never = InputDisplay extends ModernDisplay
    ? ModernDisplayWithPageUrl<InputDisplay>
    : never,
>(props: PropsWithChildren<ProviderConfig<InputDisplay, OutputDisplay>>) {
  globalState.provider_is_updating[1](true);
  try {
    return ActualDepictProvider(props);
  } finally {
    globalState.provider_is_updating[1](false);
  }
}

function ActualDepictProvider<
  InputDisplay extends Display,
  OutputDisplay extends ModernDisplay | never = InputDisplay extends ModernDisplay
    ? ModernDisplayWithPageUrl<InputDisplay>
    : never,
>(props: PropsWithChildren<ProviderConfig<InputDisplay, OutputDisplay>>) {
  const { children, navigateFunction, market, merchant, locale, metaData, sessionId } = props;
  const usedLocale = locale ?? defaultLocale;
  const { searchPagePath, urlParamName, enableCategorySuggestions, enableContentSearch, searchModalComponent } =
    props.search ?? {};

  multiple_depictprovider_guard();

  // Will run on other prop changes, but harmless
  globalState.sessionId[1](sessionId);
  globalState.usedLocale[1](usedLocale);
  globalState.enable_content_search[1](enableContentSearch);
  globalState.metaData = metaData;
  globalState.search_query_url_param_name = urlParamName;
  globalState.enableCategorySuggestions = enableCategorySuggestions;
  globalState.disable_override_listing_id[1](props.category?.disableOverrideListingId);
  globalState.searchModalComponent_ = searchModalComponent;

  setup_performance_client(merchant, market, sessionId);

  if (!market || !merchant) {
    return createElement(Fragment, null, children);
  }

  globalState.market[1](market);
  globalState.merchant[1](merchant);

  nextScrollRestorationFix();

  try {
    const {
      search_instances,
      category_instances,
      search_page_path_: [, set_search_page_path],
    } = globalState;

    const on_navigation: OnNavigation = ({ is_replace, new_url, scroll }) => {
      const new_relative_url =
        new_url.origin === location.origin ? new_url.pathname + new_url.search + new_url.hash : new_url.href; // bail out of making URL relative if it's not possible

      if (navigateFunction) {
        navigateFunction(new_relative_url, { replace: is_replace, scroll });
      } else {
        defaultNavigation(new_relative_url, is_replace, scroll);
      }
    };

    globalState.on_navigation = on_navigation;

    globalState.api ||= new DepictAPI({
      get_metadata: async () => globalState.metaData,
      get_session_id: () => untrack(globalState.sessionId[0]),
    });
    globalState.api!.display_transformers = props.displayTransformers;

    if (searchPagePath) {
      set_search_page_path(ensure_correct_formatting(searchPagePath));
    }

    if (!search_instances.get(undefined)) {
      // Create initial search instance which always exists. It i.e. gards against the state getting deleted from history.state by someone pushing to it with an empty object, which commonly people copy from code snippets.
      // Also, it emulates the behavior pre-supporting multiple "depict blocks" on the same page
      const instance = create_search_instance(false);
      search_instances.set(undefined, instance);
    }

    if (!category_instances.get(undefined)) {
      const instance = create_category_instance(false);
      category_instances.set(undefined, instance);
    }
  } catch (e) {
    // Make sure to not break the users app if we throw
    queueMicrotask(() => {
      throw e;
    });
  }

  return createElement(Fragment, null, children);
}

function ensure_correct_formatting(path: string) {
  // Make sure the path starts with a slash as it always will and is_page will fail otherwise
  if (!path.startsWith("/")) {
    return "/" + path;
  }
  return path;
}

function multiple_depictprovider_guard() {
  useEffect(() => {
    provider_instances++;
    if (provider_instances > 1) {
      throw new Error(
        "You are using multiple DepictProviders. This is not supported and will lead to unexpected behavior. You can create multiple SearchPage and CategoryPage components, but only one DepictProvider."
      );
    }
    return () => {
      provider_instances--;
    };
  }, []);
}
