import { CategoryPage as DepictCategoryPage, CategoryTitle } from "@depict-ai/ui/latest";
import { ProductCard } from "~/components/ProductCard";
import { createComputed, createMemo, createSignal, Show } from "solid-js";
import { cols_at_size } from "~/helpers/global_values";
import { HomeLink } from "~/components/HomeLink";
import { ListingSelector } from "~/components/ListingSelector";
import { get_instant_current_url_as_object } from "~/helpers/get_instant_current_url_as_object";
import { use_set_search_param } from "~/helpers/set_search_param";
import { useParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { useTopLevelContext } from "~/helpers/useTopLevelContext";
import { useGap } from "~/helpers/GapProvider";

export function NonSearchListingPage() {
  const params = useParams();
  const current_url = get_instant_current_url_as_object();
  const { is_actually_routing, depict_category } = useTopLevelContext()!;
  const set_search_param = use_set_search_param(is_actually_routing);
  const listing_selector_param = "show_listing_selector";
  const show_listing_selector = createMemo(() => current_url().searchParams.get(listing_selector_param) !== "false");
  const [layout, setLayout] = createSignal<"grid" | "slider" | "slider-without-filters" | undefined>();
  const spacing = useGap();

  createComputed(() => (depict_category.listing_query = { type: "listingId", id: params.listing_id }));

  return (
    <main>
      <Title>Collection Page</Title>
      <div class="upper_section listings">
        <HomeLink />
        <div>
          <label for="listing_selector">Show listing Selector</label>
          <input
            type="checkbox"
            checked={show_listing_selector()}
            onChange={e => set_search_param(listing_selector_param, e.currentTarget.checked + "")}
            id="listing_selector"
          />
        </div>
        <h1
          onClick={() => {
            if (!layout() || layout() === "grid") {
              setLayout("slider");
            } else if (layout() === "slider") {
              setLayout("slider-without-filters");
            } else if (layout() === "slider-without-filters") {
              setLayout("grid");
            }
          }}
        >
          Collection Page
        </h1>
      </div>
      <div class="listing-and-selector">
        <Show when={show_listing_selector()}>
          <ListingSelector />
        </Show>
        <DepictCategoryPage
          layout={layout()}
          depict_category={depict_category}
          grid_spacing={spacing()}
          cols_at_size={cols_at_size}
          product_card_template={(d, i) =>
            ProductCard({
              raw_display: d as any,
              info: i,
              localization: () => depict_category.localization,
              is_actually_routing,
            })
          }
          category_title={CategoryTitle}
        />
      </div>
    </main>
  );
}
