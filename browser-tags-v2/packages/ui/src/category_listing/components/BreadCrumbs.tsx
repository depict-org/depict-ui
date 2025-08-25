/** @jsxImportSource solid-js */
import { Accessor, createMemo, Index, Show } from "solid-js";
import { catchify } from "@depict-ai/utilishared";
import { solid_category_i18n, solid_search_i18n } from "../../locales/i18n_types";
import { SentryErrorBoundary } from "../../shared/components/SentryErrorBoundary";
import { transfer_encoded_sort_and_filter } from "../../shared/url_state/encoding";
import { PseudoRouter } from "../../shared/helper_functions/pseudo_router";
import { TextPlaceholder } from "../../shared/components/Placeholders/TextPlaceholder";
import { ProductListingWithPageURL } from "../types";
import * as IdTypes from "../IdTypes";

/**
 * Shows BreadCrumbs for a listing page. Shown in the CategoryPage as well as in SearchModalV2. Destructures properties so make sure to pass accessors.
 */
export function BreadCrumbs({
  crumb_data_: get_api_crumb_data,
  router_,
  i18n_,
  filter_query_param_prefix_,
  sorting_query_param_,
  placeholderData_ = [, , ,],
}: {
  crumb_data_: Accessor<ProductListingWithPageURL[] | undefined>;
  router_: PseudoRouter;
  i18n_: solid_category_i18n | solid_search_i18n;
  sorting_query_param_: string;
  filter_query_param_prefix_: string;
  placeholderData_?: undefined[];
}) {
  const crumb_data = createMemo(() => get_api_crumb_data() || placeholderData_);
  return (
    <SentryErrorBoundary severity_="error" message_="BreadCrumbs failed">
      <nav class="crumbs" aria-label={i18n_.breadcrumbs_aria_label_()}>
        <Index each={crumb_data()}>
          {(display_accessor, index) => {
            const href = createMemo(() =>
              transfer_encoded_sort_and_filter({
                to_url_: display_accessor()?.page_url, // page_url here can be a getter if that was added in the display transformers as a way of making this reactive
                filter_query_param_prefix_,
                sorting_query_param_,
              })
            );

            return (
              <>
                <Show when={display_accessor()} fallback={<TextPlaceholder height="calc(1em + 1px)" width="10ch" />}>
                  <a
                    class="crumb"
                    href={href()}
                    onClick={catchify((ev: MouseEvent) =>
                      router_.navigate_.go_to_({
                        new_url_: href()!,
                        is_replace_: false,
                        event_: ev,
                        force_spa_navigation_: true,
                        listing_query_: { id: display_accessor()!.listing_id, type: IdTypes.LISTING_ID },
                      })
                    )}
                  >
                    {display_accessor()!.title}
                  </a>
                </Show>
                <Show when={index < crumb_data()!.length - 1}>
                  <span class="separator">{i18n_.breadcrumbs_separator_()}</span>
                </Show>
              </>
            );
          }}
        </Index>
      </nav>
    </SentryErrorBoundary>
  );
}
