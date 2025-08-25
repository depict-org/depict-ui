import { HomeLink } from "~/components/HomeLink";
import { ListingSelector } from "~/components/ListingSelector";
import { Title } from "@solidjs/meta";

export function SelectListingPage() {
  return (
    <main>
      <Title>Select listing</Title>
      <div class="upper_section listings">
        <HomeLink />
        <div class="collection_chooser">
          <h2 style="margin-bottom:16px">Please select a listing id to be viewed</h2>
          <ListingSelector />
        </div>
      </div>
    </main>
  );
}
