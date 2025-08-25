import { LooksSliderOrGrid, SDKColsAtSize } from "@depict-ai/ui/latest";
import { createMemo, JSX, Show } from "solid-js";
import { get_locale, get_market, get_merchant } from "~/helpers/url_state";
import { HomeLink } from "~/components/HomeLink";
import { product_id_source_param_name } from "~/helpers/query_params";
import { get_instant_current_url_as_object } from "~/helpers/get_instant_current_url_as_object";
import { Title } from "@solidjs/meta";
import { useTopLevelContext } from "~/helpers/useTopLevelContext";
import { CurrentProductAndProductIDSourceConfig } from "~/pages/with_data/recommendations";
import { cols_at_size } from "~/helpers/global_values";
import { display_transformers } from "~/helpers/url_creator_transformer";
import { make_sdk_on_navigation_cb } from "~/helpers/make_sdk_on_navigation_cb";
import { useNavigate } from "@solidjs/router";
import { catchify } from "@depict-ai/utilishared/latest";
import { useGap } from "~/helpers/GapProvider";

export function LooksSliderPage() {
  const { depict_search, is_actually_routing } = useTopLevelContext()!;
  const current_location = get_instant_current_url_as_object();
  const navigate = useNavigate();
  const layoutParamName = "layout";
  const onNavigation = make_sdk_on_navigation_cb();
  const spacing = useGap();
  const searchParams = () => current_location().searchParams;
  const layoutQueryParamValue = createMemo(() => searchParams().get(layoutParamName) || "slider");
  const columnsAtSize = createMemo(() => {
    if (layoutQueryParamValue() === "slider") {
      // Slider should have fractions so one can see that one can slide (on mobile)
      return [[5], [4, 2000], [3, 1400], [2.2, 1150], [1.5, 880], [1.2, 700]] as SDKColsAtSize;
    }
    return cols_at_size;
  });

  const product_id = createMemo(() => searchParams().get(product_id_source_param_name));

  return (
    <main class="recommendations_page looks">
      <Title>Looks (in recommendation {layoutQueryParamValue as unknown as JSX.Element})</Title>
      <div class="upper_section">
        <HomeLink />
        <h1>
          Looks (in recommendation{" "}
          <span
            contentEditable={true}
            onKeyDown={catchify(e => {
              const { key, currentTarget } = e;
              const { textContent } = currentTarget;
              if (key !== "Enter") return;
              e.preventDefault();
              currentTarget.blur();
              if (textContent === "grid" || textContent === "slider") {
                if (textContent !== layoutQueryParamValue()) {
                  const url = new URL(location.href);
                  url.searchParams.set(layoutParamName, textContent);
                  navigate(url.pathname + url.search + url.hash);
                }
              } else {
                currentTarget.textContent = layoutQueryParamValue();
              }
            })}
            onBlur={({ currentTarget }) => (currentTarget.textContent = layoutQueryParamValue())}
          >
            {layoutQueryParamValue as unknown as JSX.Element}
          </span>
          )
        </h1>
      </div>
      <div class="recs_browser depict plp">
        <CurrentProductAndProductIDSourceConfig
          depict_search={depict_search}
          is_actually_routing={is_actually_routing}
          show_hackathon_shop_the_look={false}
        />
      </div>
      <br />
      <br />
      <Show when={product_id()} fallback="Enter a product id or click on a product somewhere">
        <LooksSliderOrGrid
          gridSpacing_={spacing()}
          columnsAtSize_={columnsAtSize()}
          productId_={product_id()!}
          merchant_={get_merchant()}
          market_={get_market()}
          locale_={get_locale()}
          imagePlaceholderAspectRatio_={300 / 450}
          priceFormatting_={depict_search.localization.price_formatting_}
          displayTransformers_={display_transformers}
          onNavigation_={onNavigation}
          gridOptions_={layoutQueryParamValue() === "grid" ? { view_more_button: { text: "View more" } } : undefined}
        />
      </Show>
    </main>
  );
}
