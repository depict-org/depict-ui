/** @jsxImportSource solid-js */
import { Accessor, createEffect, createMemo, For, Resource, Setter, untrack } from "solid-js";
import { SearchResponseAfterDisplayTransformer } from "../types";
import { PseudoRouter } from "../../shared/helper_functions/pseudo_router";
import { ContentCard } from "./ContentCard";
import { ContentLink } from "@depict-ai/types/api/SearchResponse";

export function ContentCards({
  search_results_,
  router_,
  setNumberContentResultsPerQuery_,
  get_search_query_,
}: {
  search_results_: Resource<(SearchResponseAfterDisplayTransformer & { failed?: true | undefined }) | undefined>;
  router_: PseudoRouter;
  setNumberContentResultsPerQuery_: Setter<Map<string, number>>;
  get_search_query_: Accessor<string>;
}) {
  const content_results = createMemo(() => search_results_()?.content_search_links);
  const content_results_by_page_url = createMemo(() => {
    const map = new Map<string, ContentLink>();
    const results = content_results();
    if (!results) return map;
    for (let i = 0; i < results.length; i++) {
      const content_result = results[i];
      map.set(content_result.page_url, content_result);
    }
    return map;
  });

  createEffect(() => {
    const results = content_results();
    const numberResults = Array.isArray(results) ? results.length : 0;
    setNumberContentResultsPerQuery_(prev => {
      prev.set(untrack(get_search_query_), numberResults);
      return prev;
    });
  });

  return (
    <For each={[...content_results_by_page_url().keys()]}>
      {page_url => {
        const content_result = createMemo(() => content_results_by_page_url().get(page_url)!);
        return <ContentCard content_result_={content_result} router_={router_} />;
      }}
    </For>
  );
}
