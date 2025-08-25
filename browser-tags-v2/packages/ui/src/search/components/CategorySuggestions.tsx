/** @jsxImportSource solid-js */
import { Accessor, createMemo, Index, JSX, Resource, Show } from "solid-js";
import { SlidableItems } from "../../shared/components/SlidableItems";
import { TextPlaceholder } from "../../shared/components/Placeholders/TextPlaceholder";
import { ListingSuggestionAfterURLCreator, SearchSuggestionsResponseAfterURLCreator } from "../types";

/** A function that renders category suggestion cards. Set to false to disable category suggestions. */
export type RenderCategorySuggestion = (
  category_suggestion: Accessor<ListingSuggestionAfterURLCreator>,
  index: number
) => JSX.Element;
interface Props {
  suggestions_: Resource<SearchSuggestionsResponseAfterURLCreator | undefined>;
  children: RenderCategorySuggestion;
}

export function CategorySuggestions({ suggestions_, children }: Props) {
  const category_suggestions_ = createMemo(
    () => suggestions_()?.suggestions.filter(s => s.type === "listing") as ListingSuggestionAfterURLCreator[]
  );
  return (
    <Show when={category_suggestions_()?.length || suggestions_.loading}>
      <div class="category-suggestions">
        <SlidableItems faded_opacity_={0.7}>
          <Show
            when={!suggestions_.loading}
            fallback={
              <div class="category-suggestion">
                <TextPlaceholder height="19px" width="133px" />
              </div>
            }
          >
            <Index each={category_suggestions_()}>{(suggestion, index) => children(suggestion, index)}</Index>
          </Show>
        </SlidableItems>
      </div>
    </Show>
  );
}
