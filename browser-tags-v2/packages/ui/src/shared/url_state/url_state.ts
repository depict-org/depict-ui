import {
  Accessor,
  batch,
  createComputed,
  createEffect,
  createRoot,
  createSignal,
  getOwner,
  on,
  onCleanup,
  runWithOwner,
  Signal,
  untrack,
} from "solid-js";
import { SortModel } from "@depict-ai/types/api/SearchRequestV3";
import { catchify, dlog, instant_exec_on_suspect_history_change } from "@depict-ai/utilishared";
import {
  decode_filters,
  decode_sorting,
  encode_filters,
  encode_sorting,
  sideways_clearing_url_hash,
  strip_encoded_filter_and_sort,
} from "./encoding";
import { FilterWithData } from "../types";
import { PseudoRouter } from "../helper_functions/pseudo_router";

// This file and submit_query.tsx should be the only one changing the actual URL based on signals.
// There's also history_dot_state_to_state for history state

type URLStateSearchOptions = {
  sorting_query_param_: string;
  filter_query_param_prefix_: string;
  router_: PseudoRouter;
  search_query_url_param_name_: string;
};

type URLStateCategoryOptions = {
  sorting_query_param_: string;
  filter_query_param_prefix_: string;
  router_: PseudoRouter;
  override_listing_id_query_param_names_?: string[];
};

type URLStateOptions = URLStateCategoryOptions | URLStateSearchOptions;

type URLStateReturnType<T extends URLStateOptions> = T extends URLStateSearchOptions
  ? {
      current_sorting_: Signal<SortModel | undefined>;
      selected_filters_: Signal<FilterWithData[]>;
      search_query_accessor_: Accessor<string>;
    }
  : {
      current_sorting_: Signal<SortModel | undefined>;
      selected_filters_: Signal<FilterWithData[]>;
      sideways_filter_clearing_flag_: Signal<boolean>;
      override_listing_id_accessor_: Accessor<string | null>;
    };

/**
 * Makes URL query parameters the source of truth for the selected sorting, filters and query. Returns three signals that update when the params in the URL change and can be used to change the URL.
 */
export function url_state<T extends URLStateOptions>(options: T): URLStateReturnType<T> {
  const router_ = options.router_;
  const search_query_url_param_name_ =
    "search_query_url_param_name_" in options ? options.search_query_url_param_name_ : undefined;
  const search_query_ = search_query_url_param_name_ ? createSignal<string>("") : undefined;
  const override_listing_id_query_param_names_ =
    "override_listing_id_query_param_names_" in options ? options.override_listing_id_query_param_names_ : undefined;
  const override_listing_id_ = override_listing_id_query_param_names_ ? createSignal<string | null>(null) : undefined;
  const get_search_query_ = search_query_?.[0];
  const set_search_query = search_query_?.[1];
  const get_override_listing_id_ = override_listing_id_?.[0];
  const set_override_listing_id = override_listing_id_?.[1];

  const current_sorting_ = createSignal<SortModel | undefined>();
  const selected_filters_ = createSignal<FilterWithData[]>([]);
  const sideways_filter_clearing_flag_ = createSignal(false);
  const [get_sorting_, set_sorting] = current_sorting_;
  const [get_selected_filters_, set_selected_filters] = selected_filters_;
  const [get_has_sideways_filter_clearing_flag_, set_has_sideways_filter_clearing_flag] =
    sideways_filter_clearing_flag_;
  const [get_current_href, set_current_href] = createSignal(globalThis?.location?.href ?? "https://example.com");
  const history_change_handler = catchify(() => set_current_href(location.href));
  const owner = getOwner() || createRoot(() => getOwner()!);
  const { sorting_query_param_, filter_query_param_prefix_ } = options;
  let writer_started = false;

  instant_exec_on_suspect_history_change.add(history_change_handler);
  onCleanup(() => instant_exec_on_suspect_history_change.delete(history_change_handler));

  createComputed(() => {
    const { searchParams, hash } = new URL(get_current_href());

    batch(() => {
      const found_sorting = decode_sorting(searchParams, sorting_query_param_);
      if (found_sorting) {
        const current_sorting = untrack(get_sorting_);
        // Do some diffing since we might assume in certain places of the code that if the signal changes it means the sorting has changed
        if (current_sorting?.field !== found_sorting.field || current_sorting?.order !== found_sorting.order) {
          set_sorting(found_sorting);
        }
      } else {
        set_sorting();
      }

      const found_filters = decode_filters(searchParams, filter_query_param_prefix_);
      const selected_filters = untrack(get_selected_filters_);
      const found_filters_map = new Map<string, any>(
        found_filters.map(({ field, op, data }) => [JSON.stringify([field, op]), data])
      );
      // Sorry for this diffing algorithm lol. Looking forwards to Records and Tuples.
      if (
        selected_filters.length !== found_filters.length ||
        !selected_filters.every(
          ({ field, op, data }) =>
            JSON.stringify(found_filters_map.get(JSON.stringify([field, op]))) === JSON.stringify(data)
        )
      ) {
        set_selected_filters(found_filters);
      }

      if (search_query_url_param_name_) {
        const found_query = searchParams.get(search_query_url_param_name_);
        set_search_query!(found_query || "");
      }

      if (override_listing_id_query_param_names_) {
        const found_override_listing_id = override_listing_id_query_param_names_
          .map(n => searchParams.get(n))
          .find(n => n);
        set_override_listing_id!(found_override_listing_id || null);
        if (found_override_listing_id) {
          dlog("Found override query id:", found_override_listing_id); // This stuff might get confusing so better log it
        }
      }

      if (hash === sideways_clearing_url_hash) {
        set_has_sideways_filter_clearing_flag(true);
      }

      if (!writer_started) {
        // The owner here is the createComputed which gets disposed the next time the computation runs - but we actually just want to delay the start of the href_writer until our signals contain the current value of the URL, therefore the runWithOwner
        runWithOwner(owner, () =>
          start_href_writer({
            get_sorting_,
            get_selected_filters_,
            router_,
            get_has_sideways_filter_clearing_flag_,
            sorting_query_param_,
            filter_query_param_prefix_,
          })
        );
        writer_started = true;
      }
    });
  });

  // @ts-ignore
  return {
    current_sorting_,
    selected_filters_,
    ...(typeof search_query_url_param_name_ === "string"
      ? { search_query_accessor_: get_search_query_! }
      : { sideways_filter_clearing_flag_ }),
    ...(typeof override_listing_id_query_param_names_ === "object"
      ? { override_listing_id_accessor_: get_override_listing_id_! }
      : {}),
  };
}

/**
 * Writes the sorting and filters to the URL query parameters when they change.
 */
function start_href_writer({
  get_sorting_,
  get_selected_filters_,
  router_,
  get_has_sideways_filter_clearing_flag_,
  sorting_query_param_,
  filter_query_param_prefix_,
}: {
  get_sorting_: Accessor<SortModel | undefined>;
  get_selected_filters_: Accessor<FilterWithData[]>;
  router_: PseudoRouter;
  get_has_sideways_filter_clearing_flag_: Accessor<boolean>;
  sorting_query_param_: string;
  filter_query_param_prefix_: string;
}) {
  createEffect(
    on(
      [get_sorting_, get_selected_filters_, get_has_sideways_filter_clearing_flag_],
      ([sorting, filters, has_sideways_filter_clearing_flag]) => {
        const url_object = new URL(location.href);
        const unmodified_search_params = [...url_object.searchParams];
        const unmodified_hash = url_object.hash;
        const { searchParams } = url_object;

        strip_encoded_filter_and_sort(searchParams, filter_query_param_prefix_, sorting_query_param_);
        encode_sorting(sorting, searchParams, sorting_query_param_);
        encode_filters(filters, searchParams, filter_query_param_prefix_);
        if (!has_sideways_filter_clearing_flag) {
          delete_sideways_param_flag(url_object);
        }

        // We can't just check if the URL is equal since sometimes the order of the parameters in the URL changes (randomly?) so we need to compare them one by one
        const new_search_params = [...searchParams];
        // Having the array middle step because if we'd check the "size" property of the map the algorithm could be fooled if there were two query parameters with the same key
        const new_search_params_map = new Map(new_search_params);
        if (
          unmodified_search_params.length !== new_search_params.length ||
          !unmodified_search_params.every(([key, value]) => new_search_params_map.get(key) === value) ||
          unmodified_hash !== url_object.hash
        ) {
          // Only update URL if it actually changed
          router_.navigate_.go_to_({
            is_replace_: true,
            new_url_: url_object.href,
            force_spa_navigation_: true,
            scroll: false,
          });
        }
      },
      { defer: true }
    )
  );
}

function delete_sideways_param_flag(url_object: URL) {
  if (url_object.hash === sideways_clearing_url_hash) {
    url_object.hash = "";
  }
}
