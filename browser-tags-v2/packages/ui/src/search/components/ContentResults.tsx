/** @jsxImportSource solid-js */
import { Accessor, createComputed, createMemo, createSignal, on, Resource, Signal, Suspense, untrack } from "solid-js";
import { SearchResponseAfterDisplayTransformer } from "../types";
import { solid_search_i18n } from "../../locales/i18n_types";
import { ShowingResultsFor, ShowingResultsForType } from "../../shared/components/ShowingResultsFor";
import { SolidLayout } from "../../shared/components/SolidLayout";
import { LayoutOptions } from "@depict-ai/utilishared";
import { format_number_of_results } from "../../shared/helper_functions/format_number_of_results";
import { PseudoRouter } from "../../shared/helper_functions/pseudo_router";
import { BaseQueryAccessor } from "../../shared/types";
import { ContentCards } from "./ContentCards";
import { ContentPlaceholderCards } from "./ContentPlaceholderCards";

export const content_results_start_rows = 1;

/**
 * Content results section in SearchPage
 */
export function ContentResults({
  search_results_,
  get_search_query_,
  i18n_,
  layout_options_,
  router_,
  query_base_,
  content_results_rows_,
}: {
  content_results_rows_: Signal<number>;
  search_results_: Resource<(SearchResponseAfterDisplayTransformer & { failed?: true | undefined }) | undefined>;
  get_search_query_: Accessor<string>;
  i18n_: solid_search_i18n;
  layout_options_: Accessor<Omit<LayoutOptions, "container_element" | "layout" | "rows">>;
  router_: PseudoRouter;
  query_base_: BaseQueryAccessor & { loading: boolean };
}) {
  const content_results = createMemo(() => search_results_()?.content_search_links);
  const num_results = createMemo(() => content_results()?.length);
  const is_loading_ = createMemo(() => search_results_.loading || query_base_.loading); // See comment in PLPResults/index.tsx on why we need this
  const formatted_number_of_results_ = format_number_of_results({
    number_: num_results,
    i18n_,
  });
  const [numberContentResultsPerQuery, setNumberContentResultsPerQuery_] = createSignal(new Map<string, number>(), {
    equals: false,
  });
  const contentResultsForCurrentQuery = createMemo(() => numberContentResultsPerQuery().get(get_search_query_()));
  // Don't show placeholder if we know there will not be any content results and someone is just toggling filters
  const placeholders_enabled = createMemo(() => contentResultsForCurrentQuery() !== 0);

  const rows_object = make_state_saved_rows(content_results_rows_, i18n_);

  return (
    <div
      class="content-results"
      style={{
        display: (is_loading_() && placeholders_enabled()) || (content_results()?.length as number) > 0 ? "" : "none",
      }}
    >
      <ShowingResultsFor
        get_search_query_={get_search_query_}
        i18n_={i18n_}
        formatted_number_of_results_={formatted_number_of_results_}
        type={ShowingResultsForType.content}
        number_of_results_={num_results}
      />
      <SolidLayout layout="grid" element_attributes={{ class: "cards" }} {...layout_options_()} rows={rows_object}>
        <Suspense
          fallback={
            <ContentPlaceholderCards
              content_results_rows_={content_results_rows_}
              cols_at_size_={createMemo(() => layout_options_().cols_at_size)}
              overrideAmount_={contentResultsForCurrentQuery}
            />
          }
        >
          <ContentCards
            router_={router_}
            search_results_={search_results_}
            setNumberContentResultsPerQuery_={setNumberContentResultsPerQuery_}
            get_search_query_={get_search_query_}
          />
        </Suspense>
      </SolidLayout>
    </div>
  );
}

function make_state_saved_rows( // similar to the one in SearchRecommendations.tsx but not enough to warrant a shared function IMO
  [get_showing_content_results_rows, set_showing_content_results_rows]: Signal<number>,
  i18n_: solid_search_i18n
) {
  const currently_visible = createSignal(untrack(get_showing_content_results_rows));
  const [get_currently_visible, set_currently_visible] = currently_visible;
  const rows: Parameters<typeof SolidLayout>[0]["rows"] = {
    currently_visible,
    start_rows: content_results_start_rows,
    button: <button class="view-more">{i18n_.view_more_()}</button>,
    view_less_button: <button class="view-less">{i18n_.view_less_()}</button>,
    rows_per_click: 3,
  };

  createComputed(
    on(get_currently_visible, new_visible => set_showing_content_results_rows(new_visible), { defer: true })
  );

  createComputed(
    on(get_showing_content_results_rows, (new_rows = content_results_start_rows) => set_currently_visible(new_rows), {
      defer: true,
    })
  );

  return rows;
}
