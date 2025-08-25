import { createEffect, createMemo, createResource, For, Show, Signal, Suspense } from "solid-js";
import { ListListingsResponseItem } from "@depict-ai/types/api/ListListingsResponseItem";
import { createStore, reconcile } from "solid-js/store";
import { ExpandingDetails, history_dot_state_to_state, ImagePlaceholder } from "@depict-ai/ui/latest";
import { link_to_pathname } from "~/helpers/link_to_pathname";
import { A, useParams } from "@solidjs/router";
import { get_locale, get_market, get_merchant } from "~/helpers/url_state";
import { ListListingsRequest } from "@depict-ai/types/api/ListListingsRequest";

export function ListingSelector() {
  // Save expanded listing state in history
  const { expanded_listings } = history_dot_state_to_state({ expanded_listings: [] as string[] }, {
    navigate_: {
      replace_state_: (new_state: { [key: string]: any }) => globalThis?.history?.replaceState(new_state, ""),
    },
  } as any);
  const [available_listings] = createResource(
    createMemo(() => [get_merchant(), get_market(), get_locale()]),
    async ([merchant, market, locale]) => {
      const url = new URL(`https://api.depict.ai/v3/listings`);
      const request: ListListingsRequest = { merchant, market, locale };
      url.search = new URLSearchParams(request as unknown as Record<string, string>) + "";
      const response = await fetch(url.href);
      const listings = (await response.json()) as ListListingsResponseItem[];
      return listings;
    }
  );

  return (
    <Suspense
      fallback={
        <div>
          <ImagePlaceholder height="min(max(100%, 500px), 500px)" width="300px" />
          <ImagePlaceholder height="min(max(100%, 500px), 500px)" width="300px" />
        </div>
      }
    >
      {(() => {
        const [listings_store, set_listings_store] = createStore<ListListingsResponseItem[]>([]);

        createEffect(() => {
          const now_available = available_listings();
          set_listings_store(reconcile(now_available || []));
        });

        return (
          <>
            <div class="listings-list depict plp">
              <RenderListings listings={listings_store} expanded_listings={expanded_listings} />
            </div>
          </>
        );
      })()}
    </Suspense>
  );
}

function RenderListings({
  listings,
  expanded_listings,
}: {
  listings: ListListingsResponseItem[];
  expanded_listings: Signal<string[]>;
}) {
  const params = useParams();
  const [get_expanded_listings, set_expanded_listings] = expanded_listings;
  const listings_by_id = createMemo(() => {
    // sort listings to have listing_type: category first and listing_type: long_tail_collection last
    // otherwise go by title alphabetically
    const sorted_listings = [...listings].sort((a, b) => {
      if (a.listing_type === "long_tail_collection" && b.listing_type !== "long_tail_collection") {
        return 1;
      }
      if (a.listing_type !== "long_tail_collection" && b.listing_type === "long_tail_collection") {
        return -1;
      }
      if (a.listing_type === "category" && b.listing_type !== "category") {
        return -1;
      }
      if (a.listing_type !== "category" && b.listing_type === "category") {
        return 1;
      }
      return a.title.localeCompare(b.title);
    });
    return Object.fromEntries(sorted_listings.map(listing => [listing.listing_id, listing]));
  });

  return (
    <For each={Object.keys(listings_by_id())}>
      {listing_id => {
        const listing = createMemo(() => listings_by_id()[listing_id]);
        const expanded_signal = [
          createMemo(() => get_expanded_listings().includes(listing_id)),
          (new_value: boolean | ((old_value: boolean) => boolean)) => {
            if (typeof new_value !== "boolean") {
              new_value = new_value(expanded_signal[0]());
            }
            set_expanded_listings(
              new_value
                ? [...get_expanded_listings(), listing_id]
                : get_expanded_listings().filter(id => id !== listing_id)
            );
          },
        ] as Signal<boolean>;
        const [expanded] = expanded_signal;
        const link = link_to_pathname("listings/" + encodeURIComponent(listing_id));
        const is_selected = createMemo(() => params.listing_id === listing_id);
        const contains_selected = createMemo(() => {
          const selected_listing_id = params.listing_id;
          const stack: ListListingsResponseItem[] = [...listing().children];
          while (stack.length) {
            const listing = stack.pop()!;
            if (listing.listing_id === selected_listing_id) {
              return true;
            }
            stack.push(...listing.children);
          }
        });
        const title_title = createMemo(() => {
          const cloned_listing = { ...listing() };
          if (cloned_listing.children) {
            // @ts-expect-error
            cloned_listing.children = "Expand below to see children";
          }
          return JSON.stringify(cloned_listing, null, 2);
        });

        return (
          <div class="listing" classList={{ selected: is_selected() }}>
            <A href={link()} class="title" title={title_title()} noScroll={true}>
              <Show when={is_selected() || contains_selected()}>
                <span class="dot" />
              </Show>
              {listing().title}
            </A>
            <span class="type">{listing().listing_type}</span>
            <Show when={listing().children.length}>
              <ExpandingDetails
                details_={(<details />) as HTMLDetailsElement}
                duration_={200}
                summary_={
                  (
                    <summary class="children" title="Click to expand children">
                      <span class="symbol" classList={{ expanded: expanded() }}>
                        <span class="minus">➖</span>
                        <span class="plus">➕</span>
                      </span>
                      <span class="text">Children</span>
                    </summary>
                  ) as HTMLElement
                }
                is_open_={expanded_signal}
              >
                <div class="listings-list">
                  <RenderListings listings={listing().children} expanded_listings={expanded_listings} />
                </div>
              </ExpandingDetails>
            </Show>
          </div>
        );
      }}
    </For>
  );
}
