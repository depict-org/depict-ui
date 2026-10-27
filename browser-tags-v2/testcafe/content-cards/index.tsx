/** @jsxImportSource solid-js */
import { createResource, createSignal } from "solid-js";
import { render } from "solid-js/web";
import { CSSGridLayout } from "../../packages/ui/src/shared/components/CSSGridLayout";
import {
  ContentBlocksByRow,
  create_content_blocks,
} from "../../packages/ui/src/shared/components/PLPResults/create_content_blocks";
import { ResultsProductCards } from "../../packages/ui/src/shared/components/PLPResults/results_product_cards";
import { ContentElement } from "../../packages/ui/src/category_listing/components/ContentElement";
import "./styles.scss";

const params = new URLSearchParams(location.search);
const columns = Number(params.get("columns") || 4);
const row = Number(params.get("row") || 1);
const count = Number(params.get("count") || 5);
const ratio = Number(params.get("ratio") || 1);
const explicitAspectRatio = params.has("aspect_ratio") ? Number(params.get("aspect_ratio")) : undefined;
const fixtureCollection = params.get("collection") || "luca-fixture";
const position = (params.get("position") || "left") as "left" | "center" | "right";
const image = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${
    400 * ratio
  }" height="400"><rect width="100%" height="100%" fill="#294b6a"/><rect x="20%" y="20%" width="60%" height="60%" fill="#d58b45"/><circle cx="50%" cy="50%" r="70" fill="#f4eee3"/></svg>`
)}`;

declare global {
  interface Window {
    contentCardTest: { setCount: (count: number) => void; setComplete: (complete: boolean) => void };
  }
}

render(() => {
  const [productCount, setCount] = createSignal(count);
  const complete = createSignal(params.get("complete") !== "false");
  const [, setLoadedCount] = createSignal(0);
  const [topRowShortened, setTopRowShortenedBy] = createSignal(0);
  const blocks: ContentBlocksByRow = [];
  const media = (aspect: number) => () => (
    <ContentElement
      type_="image"
      link_={null}
      mediaUrl_={image}
      router_={undefined as any}
      setAspectRatioWas_={() => {}}
      aspectRatioWhenAloneInRow_={() => aspect}
      imageResizer_={url => url}
    />
  );
  blocks[row] = {
    span_columns: 2,
    span_rows: explicitAspectRatio ? 1 : 2,
    position,
    ...(explicitAspectRatio ? { aspect_ratio: explicitAspectRatio } : {}),
    content: media(ratio),
  } as any;
  if (params.has("banner")) {
    blocks[0] = { span_columns: columns, span_rows: 1, position: "left", content: media(1) };
  }
  if (params.has("hidden")) {
    blocks[20] = { span_columns: 2, span_rows: 2, position: "left", content: media(1) };
  }
  const cols_at_size_ = () => [[columns, "0px"]] as [number, string][];
  const contentBlocks = create_content_blocks({
    content_blocks_: () => blocks,
    cols_at_size_,
    set_top_row_shortened_by_: setTopRowShortenedBy,
  });
  const [results] = createResource(productCount, n => ({
    displays: Array.from({ length: n }, (_, index) => ({ product_id: `p${index + 1}` })),
    cursor: params.get("complete") === "false" ? "pending" : undefined,
  }));
  window.contentCardTest = { setCount, setComplete: complete[1] };
  return (
    <div class="depict" data-fixture-collection={fixtureCollection}>
      <CSSGridLayout
        cols_at_size={cols_at_size_()}
        grid_spacing={params.get("gap") || "16px"}
        top_row_shortened_by_={topRowShortened}
        content_block_row_styles={params.has("baseline") ? [] : contentBlocks.row_styles_()}
        element_attributes={{ class: "cards css-grid" }}
      >
        <ResultsProductCards
          plp_results_={results as any}
          product_card_template_={display => {
            const productId = display && "product_id" in display ? display.product_id : "";
            return (
              <div
                class="fixture-product"
                data-product={productId}
                style={{ "min-height": params.get("height") || "160px" }}
              >
                {productId}
              </div>
            );
          }}
          first_result_in_viewport_={createSignal<number | undefined>()}
          last_result_in_viewport_={createSignal<number | undefined>()}
          all_products_loaded_={complete}
          min_products_to_fetch_={20}
          query_base_={() => ({ merchant: "fixture", market: "fixture", query: "fixture" })}
          depict_api_={{ query: () => new Promise(() => {}) } as any}
          is_loading_={() => false}
          content_blocks_={() => contentBlocks}
          setCurrentlyLoadedDisplays_={setLoadedCount}
          isSliderLayout_={() => false}
        />
        {params.has("footer") && <div class="fixture-footer">Footer</div>}
      </CSSGridLayout>
    </div>
  );
}, document.getElementById("fixture")!);
