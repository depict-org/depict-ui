import { ReactElement } from "react";

export interface SearchFieldProps {
  /**
   * A reference to the DOM element that the modal should be aligned to.
   *
   * The top of the modal will be aligned to the top of the element.
   *
   * The height of the search field in the modal will be the same as the height of the element.
   * If not provided, the modal will be aligned to the search field itself.
   */
  alignerRef?: React.RefObject<HTMLElement>;
  /**
   * When using multiple search instances on the same page, you need to set a unique stateKey for each one. We recommend using an incrementing number, such as "1", "2", "3", etc. To associate a modal with a SearchPage keyed component, set the same stateKey on both. If no stateKey is provided, the "default" instance will be used.
   */
  stateKey?: string;
}

export interface UseSearchFieldReturn {
  /**
   * A React component that renders the search field.
   */
  SearchField: () => ReactElement;
}
