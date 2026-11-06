/** @jsxImportSource solid-js */
import { Accessor, createMemo, Show } from "solid-js";
import { catchify } from "@depict-ai/utilishared";
import { solid_search_i18n } from "../../locales/i18n_types";

/**
 * True only when the engine says that no product matched the query and the results are similar products.
 * Unknown (null or absent) is not a fallback: the notice must never say "no exact matches" for a real match.
 */
export function is_similar_products_fallback(
  response: { is_fallback?: boolean | null; displays?: unknown[] } | undefined
): boolean {
  return response?.is_fallback === true && !!response.displays?.length;
}

export function NoExactMatches({
  get_search_query_,
  i18n_,
  is_fallback_,
}: {
  get_search_query_: Accessor<string>;
  i18n_: solid_search_i18n;
  is_fallback_: Accessor<boolean>;
}) {
  const contents = createMemo(
    catchify(() => i18n_.get_no_exact_matches_?.()?.((<b>{get_search_query_()}</b>) as HTMLElement))
  );
  return (
    <Show when={is_fallback_() && get_search_query_().trim() !== "" && contents()}>
      <div class="no-exact-matches" role="status">
        {contents()}
      </div>
    </Show>
  );
}
