/** @jsxImportSource solid-js */
import { Accessor, JSX as solid_JSX } from "solid-js";
import { TextPlaceholder } from "../../shared/components/Placeholders/TextPlaceholder";
import { category_title_type_symbol } from "../helpers/category_title_type";

export const CategoryTitle = /*@__PURE__*/ (() => {
  const actual_function = ({
    category_title_,
    product_count_,
  }: {
    category_title_: Accessor<string | undefined>;
    product_count_: solid_JSX.Element;
  }) => {
    return (
      <div class="category-title">
        <h1 class="title">{category_title_() || <TextPlaceholder height="1em" width="10ch" />}</h1>
        <span class="explanation"> — {product_count_}</span>
      </div>
    );
  };
  // This is wrong but parcel can't build correctly, it says unexpected undefined
  (actual_function as any)[category_title_type_symbol] = "simple";

  return actual_function;
})();
