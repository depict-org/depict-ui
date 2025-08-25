import {
  BaseProviderConfig,
  BaseSearchProviderConfig,
  DepictAPI,
  DepictSearch,
  modalVersionSymbol,
  ModernDisplayWithPageUrl,
  open_modal_with_alignment,
  SearchFilter,
  SearchModalV2,
} from "@depict-ai/ui";
import { search_i18n } from "@depict-ai/ui/locales";
import { Display, ModernDisplay } from "@depict-ai/utilishared";
import { internalSearch } from "./internal_state";

type SearchProviderConfig<
  OriginalDisplay extends Display,
  OutputDisplay extends ModernDisplay | never,
> = BaseProviderConfig<OriginalDisplay, OutputDisplay> &
  BaseSearchProviderConfig<OriginalDisplay, OutputDisplay> & {
    locale: search_i18n;
  };

export class DepictSearchProvider<
  OriginalDisplay extends Display,
  OutputDisplay extends ModernDisplay | never = OriginalDisplay extends ModernDisplay
    ? ModernDisplayWithPageUrl<OriginalDisplay>
    : never,
> {
  #search: DepictSearch<OriginalDisplay, OutputDisplay>;
  #modalVersion: 1 | 2;

  openModal(alignerElement?: HTMLElement) {
    const runAnimations_ = this.#modalVersion === 2;
    if (alignerElement) {
      open_modal_with_alignment<OriginalDisplay, OutputDisplay>({
        location: "aligned",
        element: alignerElement,
        search: this.#search,
        runAnimations_,
      });
    } else {
      open_modal_with_alignment<OriginalDisplay, OutputDisplay>({
        location: "centered",
        search: this.#search,
        runAnimations_,
      });
    }
  }

  fetchSearchResults(
    query: string,
    filters?: SearchFilter[],
    maxResults?: number
  ): Promise<([OutputDisplay] extends [never] ? OriginalDisplay : ModernDisplayWithPageUrl<OutputDisplay>)[]> {
    return this.#search.fetchSearchResults(query, filters, maxResults);
  }

  // Todo: Expose changing merchant and market etc, same as react-ui.

  constructor(options: SearchProviderConfig<OriginalDisplay, OutputDisplay>) {
    const {
      market,
      merchant,
      sessionId,
      metaData,
      locale,
      urlParamName,
      enableCategorySuggestions,
      enableContentSearch,
      searchPagePath,
      displayTransformers,
      searchModalComponent,
    } = options;

    const api = new DepictAPI({
      get_metadata: async () => metaData,
      get_session_id: () => sessionId,
      // @ts-ignore
      display_transformers: displayTransformers,
    });

    const modalComponentToUse =
      searchModalComponent ||
      ((process.env.NO_SEARCH_MODAL_DEFAULT === "true" ? undefined : SearchModalV2) as typeof SearchModalV2);

    this.#modalVersion = modalComponentToUse[modalVersionSymbol];

    this.#search = new DepictSearch<OriginalDisplay, OutputDisplay>({
      api,
      market,
      merchant,
      search_query_url_param_name: urlParamName,
      enable_category_suggestions: enableCategorySuggestions ?? false, // default false
      url_transformer: url => (url.pathname = searchPagePath),
      localization: locale,
      unique_instance_key_for_state: options.uniqueInstanceKeyForState,
      enable_content_search: enableContentSearch,
      searchModalComponent: modalComponentToUse,
    });

    internalSearch.set(this, this.#search);
  }
}
