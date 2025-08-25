import {
  add_version_query_params,
  base_url,
  catchify,
  Display,
  dlog,
  dwarn,
  fetch_retry,
  get_session_id,
  make_url_with_query_params,
  ModernDisplay,
  sort_obj,
} from "@depict-ai/utilishared";
import { SearchSuggestionsRequestV3 } from "@depict-ai/types/api/SearchSuggestionsRequestV3";
import { SearchResponseAfterDisplayTransformer, SearchSuggestionsResponseAfterURLCreator } from "../search/types";
import {
  GetListingResponseAfterDisplayTransformer,
  ProductListingResponseAfterDisplayTransformer,
} from "../category_listing/types";
import {
  ListingSuggestion,
  ProductListing,
  QuerySuggestion,
  SearchSuggestionsResponseV3,
} from "@depict-ai/types/api/SearchSuggestionsResponseV3";
import { modify_fiters_to_group_title_as_field } from "./helper_functions/modify_fiters_to_group_title_as_field";
import {
  DisplayTransformers,
  ListingSuggestionForTransformer,
  ModernDisplayWithPageUrl,
  SomethingTakingADisplayTransformers,
} from "./display_transformer_types";
import { ContentLink } from "@depict-ai/types/api/SearchResponse";
import { ProductListingRequestV3 } from "@depict-ai/types/api/ProductListingRequestV3";
import { GetListingRequest } from "@depict-ai/types/api/GetListingRequest";
import { BaseSearchRequestV3 } from "@depict-ai/types/api/BaseSearchRequestV3";
import { SearchRequestV3 } from "@depict-ai/types/api/SearchRequestV3";
import { GetListingResponse } from "@depict-ai/types/api/GetListingResponse";
import * as IdTypes from "../category_listing/IdTypes";
import { create_quicklinks_and_breadcrumbs_and_run_transformer } from "./helper_functions/create_quicklinks_and_breadcrumbs_and_run_transformer";
import { mergeProps } from "solid-js";

const v3_base_url = base_url + "/v3/";
const search_base_url = v3_base_url + "search/";

type DepictAPIConstructorOptions<InputDisplay extends Display, OutputDisplay extends ModernDisplay | never> = {
  get_metadata?: () => Promise<{ [k: string]: string } | undefined>;
  get_session_id?: () => string | undefined;
} & SomethingTakingADisplayTransformers<InputDisplay, OutputDisplay>;

export interface GetListingOptions extends Omit<GetListingRequest, "listing_id"> {
  session_id?: string;
  id_to_query_for_: string;
  id_type_: typeof IdTypes.LISTING_ID | typeof IdTypes.EXTERNAL_ID;
}

/**
 * Class that handles all communication done in PLP code with the Depict API. (Notably not for recommendations currently).
 * It handles caching, retries and errors and is the only place that should be making requests to the Depict API.
 */
export class DepictAPI<
  InputDisplay extends Display,
  OutputDisplay extends ModernDisplay | never = InputDisplay extends ModernDisplay
    ? ModernDisplayWithPageUrl<InputDisplay>
    : never,
> {
  display_transformers: DisplayTransformers<ModernDisplay, OutputDisplay> | undefined;
  #supports_finalization_registry = typeof FinalizationRegistry === "function";
  #cache_objs: Record<
    string,
    {
      in_progress_: Partial<{
        [key: string]: Promise<{ [key: string]: any }>;
      }>;
      cache_: Partial<{
        [key: string]: WeakRef<{ [key: string]: any }>;
      }>;
      finalization_registry_: FinalizationRegistry<string> | undefined;
    }
  > = {};

  #get_cache_obj_for_endpoint<
    O extends
      | SearchResponseAfterDisplayTransformer
      | ProductListingResponseAfterDisplayTransformer
      | ({ displays: Display[] } & { failed?: true })
      | GetListingResponseAfterDisplayTransformer,
  >(endpoint: string) {
    return (this.#cache_objs[endpoint] ||= {
      in_progress_: {} as Partial<{ [key: string]: Promise<O> }>,
      cache_: {} as Partial<{ [key: string]: WeakRef<O> }>,
      finalization_registry_: this.#supports_finalization_registry
        ? new FinalizationRegistry<string>(
            catchify(key => {
              const our_cache = this.#cache_objs[endpoint].cache_;
              dlog("[Search API]: removing", key, "from", our_cache);
              delete our_cache[key];
            })
          )
        : undefined,
    }) as {
      in_progress_: Partial<{
        [key: string]: Promise<O>;
      }>;
      cache_: Partial<{
        [key: string]: WeakRef<O>;
      }>;
      finalization_registry_: FinalizationRegistry<string> | undefined;
    };
  }

  #add_ids_to_request = <
    T extends BaseSearchRequestV3 | SearchSuggestionsRequestV3 | ProductListingRequestV3 | GetListingOptions,
  >(
    input_req: T
  ) => {
    const request = { ...input_req };
    request.session_id ??= this.#get_session_id?.() || get_session_id();
    return request;
  };

  readonly #get_metadata?: () => Promise<{ [k: string]: string } | undefined>;
  readonly #get_session_id?: () => string | undefined;

  /**
   * Runs the displayTransformer for the suggest endpoints results
   */
  async #run_url_creator_for_suggest(
    merchant: string,
    market: string,
    locale: string,
    response: SearchSuggestionsResponseV3
  ) {
    const category_transformer = this.display_transformers?.categories;
    if (!category_transformer) return response as SearchSuggestionsResponseAfterURLCreator;
    const incoming_suggestions = response.suggestions;
    const type_to_transform = "listing";
    // find category suggestions, run thing with them, and then replace them
    // Also give the transformer (deduplicated) all ancestors along with a way to tell them apart, so we can create breadcrumbs
    const category_suggestions = incoming_suggestions.filter(
      suggestion => suggestion.type === type_to_transform
    ) as ListingSuggestion[];
    const ancestorsByListingId = Object.fromEntries(
      category_suggestions // Deduplicate by listing_id since we don't need to mention the same listing twice. Also add in ancestors, so they can be used for constructing the page_url
        .flatMap(({ ancestors }) => ancestors.map((item, index) => ({ ...item, ancestors: ancestors.slice(0, index) })))
        .map(ancestor => [ancestor.listing_id, ancestor])
    );
    const forTransformer: ListingSuggestionForTransformer[] = [
      ...category_suggestions.map(suggestion => ({ ...suggestion, is_suggestion: true }) as const),
      ...Object.values(ancestorsByListingId).map(ancestor => ({ ...ancestor, is_suggestion: false }) as const),
    ];
    const transformerResult: (ListingSuggestionForTransformer & { page_url: string })[] = [
      ...(await category_transformer!({
        market,
        merchant,
        locale,
        data: forTransformer,
      })),
    ];
    // Filter out our transformed ancestors
    const transformedAncestors = Object.fromEntries(
      transformerResult.filter(item => item.is_suggestion === false).map(item => [item.listing_id, item])
    );
    // Add the now transformed ancestors into the ancestors of the listing suggestions
    const transformedSuggestions: (QuerySuggestion | ListingSuggestion)[] = (
      transformerResult.filter(item => item.is_suggestion !== false) as (ListingSuggestion & { is_suggestion: true })[]
    ).map(item =>
      mergeProps(item, {
        // Use mergeProps instead of spread since page_url and other properties could be a getter that solid components should call
        ancestors: item.ancestors.map(ancestor => {
          const newAncestor = transformedAncestors[ancestor.listing_id];
          if (!newAncestor) {
            throw new Error(
              "Failed populating ancestors of listing suggestions with transformed ancestors (that have page_url). No new ancestor for " +
                JSON.stringify(ancestor)
            );
          }
          return newAncestor as ProductListing & { external_id: string };
        }),
      })
    );
    // Then add-back query suggestions at their original indices
    for (let i = 0; i < incoming_suggestions.length; i++) {
      const item = incoming_suggestions[i];
      if (item.type === type_to_transform) continue;
      transformedSuggestions.splice(i, 0, item as QuerySuggestion);
    }
    response.suggestions = transformedSuggestions;
    return response as SearchSuggestionsResponseAfterURLCreator;
  }

  /**
   * rest = everything except query suggestions
   */
  async #run_display_transformers_for_rest(
    merchant: string,
    market: string,
    locale: string,
    input_data:
      | {
          displays?: Display[];
          content_search_links?: ContentLink[];
          ancestors?: never;
        }
      | (GetListingResponse & { displays?: never; content_search_links?: never }),
    currentListingForTransformer?: Promise<ProductListing>
  ) {
    const { display_transformers } = this;
    const product_transformer = display_transformers?.products;
    const category_transformer = display_transformers?.categories;
    const content_result_transformer = display_transformers?.contentResults;
    const displays: typeof input_data.displays | ModernDisplayWithPageUrl<ModernDisplay> = input_data.displays;
    const { content_search_links } = input_data;
    if (displays && product_transformer) {
      const transformed_displays = await product_transformer!({
        merchant,
        market,
        locale,
        displays: [...(displays as any)],
        currentListing: currentListingForTransformer,
      });
      input_data.displays = transformed_displays;
    }

    if (content_search_links?.length && content_result_transformer) {
      input_data.content_search_links = await content_result_transformer({
        merchant,
        market,
        locale,
        data: [...content_search_links],
      });
    }

    if (input_data.ancestors) {
      return await create_quicklinks_and_breadcrumbs_and_run_transformer({
        input_data_: input_data,
        category_transformer_: category_transformer,
        merchant_: merchant,
        market_: market,
        locale_: locale,
      });
    }
    return input_data;
  }

  async #cached_request<
    I extends BaseSearchRequestV3 | ProductListingRequestV3 | GetListingOptions,
    O extends
      | SearchResponseAfterDisplayTransformer
      | ({ displays: Display[] } & { failed?: true })
      | ProductListingResponseAfterDisplayTransformer
      | GetListingResponseAfterDisplayTransformer,
  >({
    endpoint_,
    input_req_,
    fallback_response_,
    method_ = "POST",
    currentListingForTransformer_,
  }: {
    endpoint_: string;
    input_req_: I;
    fallback_response_: (request: I) => O;
    method_?: "POST" | "GET";
    currentListingForTransformer_?: Promise<ProductListing>;
  }) {
    const cache_obj = this.#get_cache_obj_for_endpoint<O>(endpoint_);
    const with_ids = this.#add_ids_to_request(input_req_);
    const metaData = await this.#get_metadata?.();
    const request = metaData ? Object.assign(with_ids, { metadata: metaData }) : with_ids;
    const sorted_request = sort_obj(request);

    const body = JSON.stringify(sorted_request);
    const response_from_cache = cache_obj.cache_[body]?.deref?.();
    if (response_from_cache) {
      return response_from_cache;
    }

    const in_progress_request = cache_obj.in_progress_[body];
    if (in_progress_request) {
      return in_progress_request;
    }

    let resolve_in_progress: (value: O | PromiseLike<O>) => void;
    cache_obj.in_progress_[body] = new Promise<O>(r => (resolve_in_progress = r));
    try {
      const is_post = method_ === "POST";
      const url_to_request = is_post ? endpoint_ : make_url_with_query_params(endpoint_, sorted_request);
      const api_response: false | Response = await fetch_retry(add_version_query_params(url_to_request), {
        method: method_,
        ...(is_post ? { body } : {}),
      });

      return_successfully: {
        if (!api_response || api_response.status !== 200) {
          break return_successfully;
        }

        let result: O;
        try {
          const unmodified_result = await api_response.json();
          result = (await this.#run_display_transformers_for_rest(
            input_req_.merchant,
            input_req_.market,
            input_req_.locale,
            unmodified_result,
            currentListingForTransformer_
          )) as unknown as O;
        } catch (e) {
          dwarn("displayTransformer or json decoding failed", e);
          break return_successfully;
        }

        // Here result actually becomes O
        result = modify_fiters_to_group_title_as_field(result);

        cache_obj.cache_[body] = new WeakRef(result);
        resolve_in_progress!(result);

        setTimeout(
          catchify(() => {
            if (this.#supports_finalization_registry) {
              cache_obj.finalization_registry_!.register(result, body); // delete key from cache when value (WeakRefs) are collected
            } else {
              // delete things from cache after 5 minutes, so it doesn't get too heavy
              setTimeout(
                catchify(() => delete cache_obj.cache_[body]),
                1000 * 60 * 5
              );
            }
          }),
          1000 * 60 // cache values for at least 60 seconds
        );

        return result;
      }

      // If we get here, the request failed
      const retval = fallback_response_(input_req_);
      resolve_in_progress!(retval);
      return retval;
    } finally {
      delete cache_obj.in_progress_[body];
    }
  }

  constructor(options: DepictAPIConstructorOptions<InputDisplay, OutputDisplay>) {
    const { get_metadata, get_session_id, display_transformers } = options ?? {};
    this.#get_metadata = get_metadata;
    this.#get_session_id = get_session_id;
    this.display_transformers = display_transformers;
  }

  async suggest(
    input_req: SearchSuggestionsRequestV3
  ): Promise<SearchSuggestionsResponseAfterURLCreator & { failed?: true }> {
    const with_ids = this.#add_ids_to_request(input_req);
    const metaData = await this.#get_metadata?.();
    const request = metaData ? Object.assign(with_ids, { metadata: JSON.stringify(metaData) }) : with_ids;

    const url = make_url_with_query_params(search_base_url + "suggestions", request);
    const results = await fetch_retry(add_version_query_params(url));
    attempt_to_return_api_response: {
      if (!results) {
        break attempt_to_return_api_response;
      }
      const decoded_json = (await results.json()) as SearchSuggestionsResponseV3;
      if (!Array.isArray(decoded_json?.suggestions)) {
        break attempt_to_return_api_response;
      }
      try {
        return await this.#run_url_creator_for_suggest(
          input_req.merchant,
          input_req.market,
          input_req.locale,
          decoded_json
        );
      } catch (e) {
        dwarn("displayTransformer failed", e);
      }
    }
    return {
      "suggestions_request_id": "error",
      "suggestions": [],
      failed: true,
    };
  }

  async query(input_req: SearchRequestV3): Promise<SearchResponseAfterDisplayTransformer & { failed?: true }> {
    return await this.#cached_request<SearchRequestV3, SearchResponseAfterDisplayTransformer & { failed?: true }>({
      endpoint_: search_base_url + "results",
      input_req_: input_req,
      fallback_response_: () => ({
        "n_hits": 0,
        "displays": [],
        "sorts": [],
        "filters": [],
        "search_request_id": "error",
        failed: true,
      }),
    });
  }

  async get_listing({
    id_type_,
    id_to_query_for_,
    ...input_req
  }: GetListingOptions): Promise<GetListingResponseAfterDisplayTransformer & { failed?: true }> {
    return await this.#cached_request<
      Omit<GetListingOptions, "id_type_" | "id_to_query_for_">,
      GetListingResponseAfterDisplayTransformer & { failed?: true }
    >({
      endpoint_:
        v3_base_url +
        "listings/" +
        (id_type_ === IdTypes.EXTERNAL_ID ? "external_id/" : "") +
        encodeURIComponent(id_to_query_for_),
      input_req_: input_req,
      fallback_response_: () => ({
        listing_id: "",
        listing_type: "category",
        title: "",
        slug: "",
        show_in_breadcrumbs: false,
        show_in_quicklinks: false,
        breadcrumbs: [],
        quick_links: [],
        image_urls: [],
        failed: true,
        content_blocks: [],
      }),
      method_: "GET",
    });
  }

  async get_listing_products({
    id_to_query_for_,
    id_type_,
    currentListingForTransformer_,
    ...input_req_
  }: ProductListingRequestV3 & {
    id_to_query_for_: string;
    id_type_: typeof IdTypes.LISTING_ID | typeof IdTypes.EXTERNAL_ID;
    currentListingForTransformer_: Promise<ProductListing>;
  }): Promise<ProductListingResponseAfterDisplayTransformer & { failed?: true }> {
    return await this.#cached_request<
      ProductListingRequestV3,
      ProductListingResponseAfterDisplayTransformer & { failed?: true }
    >({
      endpoint_:
        v3_base_url +
        "listings/" +
        (id_type_ === IdTypes.EXTERNAL_ID ? "external_id/" : "") +
        encodeURIComponent(id_to_query_for_) +
        "/products",
      input_req_,
      currentListingForTransformer_,
      fallback_response_: () => ({
        "n_hits": 0,
        "displays": [],
        "sorts": [],
        "filters": [],
        "product_listing_request_id": "error",
        failed: true,
      }),
    });
  }

  async get_recommended<T extends Display>(input_req: BaseSearchRequestV3) {
    return await this.#cached_request<BaseSearchRequestV3, { displays: T[] } & { failed?: true }>({
      endpoint_: search_base_url + "related",
      input_req_: input_req,
      fallback_response_: () => ({
        displays: [],
      }),
    });
  }
}
