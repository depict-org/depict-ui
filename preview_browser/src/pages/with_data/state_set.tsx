import { A, useLocation } from "@solidjs/router";
import { link_to_pathname } from "~/helpers/link_to_pathname";
import { Show } from "solid-js";
import { Link, Title } from "@solidjs/meta";

export function StateSet() {
  const search_link = link_to_pathname("search");
  const recommendations_link = link_to_pathname("recommendations");
  const looksLink = link_to_pathname("looks-slider");
  const listings_link = link_to_pathname("listings");
  const types_link = link_to_pathname("types");
  const solid_location = useLocation();

  return (
    <main class="state_set depict plp">
      <Title>Preview Browser</Title>
      <Show when={solid_location.search}>
        <Link rel="canonical" href={location.origin + solid_location.pathname + solid_location.hash} />
      </Show>
      <h1>Preview Browser</h1>
      <p>Thank you for configuring a merchant, market and locale</p>
      <p>
        <b>Please press on one of the buttons below</b>
      </p>
      <div class="links">
        <A href={search_link()}>
          <button class="major">Search</button>
        </A>
        <A href={recommendations_link()}>
          <button class="major">Recommendations</button>
        </A>
        <A href={types_link()}>
          <button class="major">Types for recommendations</button>
        </A>
        <A href={looksLink()}>
          <button class="major">Looks (in recommendation slider)</button>
        </A>
        <A href={listings_link()}>
          <button class="major">Listings (Categories, collections, etc)</button>
        </A>
      </div>
    </main>
  );
}
