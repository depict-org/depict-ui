import {
  BaseCategoryProviderConfig,
  BaseProviderConfig,
  DepictAPI,
  DepictCategory,
  ListingQuery,
  ModernDisplayWithPageUrl,
} from "@depict-ai/ui";
import { category_i18n } from "@depict-ai/ui/locales";
import { catchify, Display, href_change_ipns, ModernDisplay } from "@depict-ai/utilishared";
import { internalCategory } from "./internal_state";

type CategoryProviderConfig<
  OriginalDisplay extends Display,
  OutputDisplay extends ModernDisplay | never,
> = BaseCategoryProviderConfig &
  BaseProviderConfig<OriginalDisplay, OutputDisplay> & {
    /**
     * The listing to query Depict for. `type` can be `"listingId"` or `"externalId"`..
     * If `id` is `"listingId"`, it should be a uuid where Depict is the source of truth, you can get them here: https://api.depict.ai/docs#tag/Listing/operation/Get_Listings_v3_listings_get.
     * If `id` is `"externalId"`, it should be the id of the product listing in your system - whatever was passed to Depict during data ingestion.
     */
    listingQuery: ListingQuery;
    /**
     * Category internationalisation (strings, price formatting and locale to request from backend)
     */
    locale: category_i18n;
  };

export class DepictCategoryProvider<
  OriginalDisplay extends Display,
  OutputDisplay extends ModernDisplay | never = OriginalDisplay extends ModernDisplay
    ? ModernDisplayWithPageUrl<OriginalDisplay>
    : never,
> {
  #category: DepictCategory<OriginalDisplay, OutputDisplay>;
  #listing_query_state_key: string;

  get listingQuery(): ListingQuery {
    return this.#category.listing_query;
  }

  set listingQuery(query: ListingQuery) {
    // When they set a category id, save it in the state, so we can restore it on back/forward
    const old_state = history.state;
    if (old_state[this.#listing_query_state_key] !== query) {
      history.replaceState({ ...old_state, [this.#listing_query_state_key]: query }, "", location.href);
    }
    this.#category.listing_query = query;
  }

  get disableOverrideListingId(): boolean | undefined {
    return this.#category.disable_override_listing_id;
  }

  set disableOverrideListingId(disable: boolean | undefined) {
    this.#category.disable_override_listing_id = disable;
  }

  // Todo: Expose changing merchant and market etc, same as react-ui.

  constructor(options: CategoryProviderConfig<OriginalDisplay, OutputDisplay>) {
    const {
      market,
      merchant,
      sessionId,
      metaData,
      locale,
      listingQuery,
      disableOverrideListingId,
      displayTransformers,
      uniqueInstanceKeyForState = "",
    } = options;

    const api = new DepictAPI({
      get_metadata: async () => metaData,
      get_session_id: () => sessionId,
      // @ts-ignore
      display_transformers: displayTransformers,
    });

    this.#listing_query_state_key = `category${uniqueInstanceKeyForState}_current_listing_query`;

    this.#category = new DepictCategory({
      api,
      market,
      merchant,
      localization: locale,
      unique_instance_key_for_state: uniqueInstanceKeyForState,
      listing_query_state_key: this.#listing_query_state_key,
      // Navigate between different categories using `history.pushState` by default, to avoid costly full page loads on server side rendered sites
    });

    this.listingQuery = listingQuery; // Here we need to call the setter on `this`, because we want to update the state so that when ppl go back to the initial page, they get the right category

    if (typeof disableOverrideListingId === "boolean") {
      this.#category.disable_override_listing_id = disableOverrideListingId;
    }

    internalCategory.set(this, this.#category);

    catchify(async () => {
      for await (const _ of href_change_ipns) {
        // If someone pushes a new page with a new id, or we go back/forward, update the category id
        const query_in_state = history.state[this.#listing_query_state_key] as undefined | ListingQuery;
        if (
          query_in_state &&
          (query_in_state.id !== this.listingQuery.id || query_in_state.type !== this.listingQuery.type)
        ) {
          // Don't actually call the setter on (this), because we don't want to update the state
          this.#category.listing_query = query_in_state;
        }
      }
    })();
  }
}
