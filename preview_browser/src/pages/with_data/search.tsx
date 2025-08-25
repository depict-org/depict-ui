import { SearchPage as DepictSearchPage } from "@depict-ai/ui/latest";
import { ProductCard } from "~/components/ProductCard";
import { cols_at_size } from "~/helpers/global_values";
import { HomeLink } from "~/components/HomeLink";
import { Title } from "@solidjs/meta";
import { useTopLevelContext } from "~/helpers/useTopLevelContext";
import { ModernDisplay } from "@depict-ai/utilishared";
import { useGap } from "~/helpers/GapProvider";

export function SearchPage() {
  if (!useTopLevelContext()?.depict_search) {
    debugger;
  }
  const { depict_search, is_actually_routing } = useTopLevelContext()!;
  const spacing = useGap();

  return (
    <main>
      <Title>Search Page</Title>
      <div class="upper_section">
        <HomeLink />
        <h1>Search Page</h1>
      </div>
      <DepictSearchPage
        depict_search={depict_search}
        grid_spacing={spacing()}
        cols_at_size={cols_at_size}
        product_card_template={(d, i) =>
          ProductCard({
            raw_display: d as ModernDisplay,
            info: i,
            localization: () => depict_search.localization,
            is_actually_routing,
          })
        }
      />
    </main>
  );
}
