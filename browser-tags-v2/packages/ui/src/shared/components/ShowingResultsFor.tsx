/** @jsxImportSource solid-js */
import { Accessor, createMemo } from "solid-js";
import { catchify } from "@depict-ai/utilishared";
import { solid_search_i18n } from "../../locales/i18n_types";

export function ShowingResultsFor({
  get_search_query_,
  i18n_,
  formatted_number_of_results_,
  number_of_results_,
  type,
}: {
  get_search_query_: Accessor<string>;
  i18n_: solid_search_i18n;
  formatted_number_of_results_: Accessor<string>;
  type: ShowingResultsForType;
  number_of_results_: Accessor<number | undefined>;
}) {
  const contents = createMemo(
    catchify(() => {
      const q = get_search_query_();
      return i18n_[type === ShowingResultsForType.content ? "get_showing_pages_for_" : "get_showing_results_for_"]()(
        (<b>{q}</b>) as HTMLElement,
        (<b>{formatted_number_of_results_()}</b>) as HTMLElement,
        !!q,
        number_of_results_()
      );
    })
  );
  return <div class="results-for">{contents()}</div>;
}

export const enum ShowingResultsForType {
  products,
  content,
}
