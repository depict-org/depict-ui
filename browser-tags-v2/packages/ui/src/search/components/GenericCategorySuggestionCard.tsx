/** @jsxImportSource solid-js */
import { Accessor, createMemo, Show } from "solid-js";
import { catchify } from "@depict-ai/utilishared";
import { PseudoRouter } from "../../shared/helper_functions/pseudo_router";
import { ListingSuggestionAfterURLCreator } from "../types";

export function GenericCategorySuggestionCard({
  category_suggestion_,
  router_,
}: {
  category_suggestion_: Accessor<ListingSuggestionAfterURLCreator>;
  router_: PseudoRouter;
}) {
  const parentTitle = createMemo(() => category_suggestion_().ancestors.at(-1)?.title);
  return (
    <a
      class="category-suggestion"
      href={category_suggestion_().page_url}
      onClick={catchify((e: MouseEvent) => {
        router_.navigate_.go_to_({
          new_url_: category_suggestion_().page_url,
          is_replace_: false,
          event_: e,
        });
      })}
    >
      <span class="title">{category_suggestion_().title}</span>
      <Show when={parentTitle()}>
        <span class="parent-title">{parentTitle()}</span>
      </Show>
    </a>
  );
}
