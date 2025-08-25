import { modalVersionSymbol } from "../../../search/helper_functions/modalVersionSymbol";

export function RawBackIconV2() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
      <path d="M8.089 16.288l-5.625-5.625a.94.94 0 0 1-.276-.664c0-.123.024-.246.072-.36a.94.94 0 0 1 .204-.305L8.089 3.71a.94.94 0 0 1 1.328 0 .94.94 0 0 1 0 1.328L5.393 9.063h11.484a.94.94 0 0 1 .938.937c0 .249-.099.487-.275.663s-.414.275-.663.275H5.393l4.025 4.024a.94.94 0 0 1 0 1.328.94.94 0 0 1-1.328 0v-.002z" />
    </svg>
  );
}

/**
 * Icon used in the SearchField if the new search modal is used
 */
export const BackIconV2 = /*@__PURE__*/ (() => {
  RawBackIconV2[modalVersionSymbol] = 2; // Lil hack so that we can identify this back icon in SearchField.tsx and set the correct tabindex
  return RawBackIconV2;
})();
