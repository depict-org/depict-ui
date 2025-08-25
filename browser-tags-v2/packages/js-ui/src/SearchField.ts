import { SearchField as OrigSearchField } from "@depict-ai/ui";
import { Display } from "@depict-ai/utilishared";
import { DepictSearchProvider } from "./DepictSearchProvider";
import { internalSearch } from "./internal_state";

interface SearchFieldConfig<T extends Display> {
  searchProvider: DepictSearchProvider<T>;
  /**
   * A DOM element that the modal should be aligned to.
   *
   * The top of the modal will be aligned to the top of the element.
   *
   * The height of the search field in the modal will be the same as the height of the element.
   * If not provided, the modal will be aligned to the search field itself.
   */
  alignerRef?: HTMLElement;
}

export function SearchField<T extends Display>({ searchProvider, alignerRef }: SearchFieldConfig<T>): HTMLElement {
  // Todo: get rid of wrapper div by making SearchField just export one element. Comments can go inside that element.
  return OrigSearchField({
    depict_search: internalSearch.get(searchProvider)!,
    aligner_ref: alignerRef,
  })[0] as HTMLDivElement;
}
