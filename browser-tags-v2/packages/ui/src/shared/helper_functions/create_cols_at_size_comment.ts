import { isServer } from "solid-js/web";

export function create_cols_at_size_comment(what = "grid") {
  const text =
    "Please try setting `columnsAtSize`/`gridSpacing` on the `SearchPage`/`CategoryPage` components to change the " +
    what +
    " before setting it with CSS. If you do with CSS, set `columnsAtSize` to an empty array to ensure no declarations created by the SDK leak through.";
  return isServer ? ({ t: `<!-- ${text} -->` } as unknown as string) : document.createComment(text);
}
