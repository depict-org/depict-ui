import { createMemo, Index, Suspense } from "solid-js";
import { HomeLink } from "~/components/HomeLink";
import { Title } from "@solidjs/meta";
import { fetch_tenant_types } from "~/pages/with_data/recommendations";

export function TypesPage() {
  const types = fetch_tenant_types();

  return (
    <main class="recommendations_page">
      <Title>Types for recommendations</Title>
      <div class="upper_section">
        <HomeLink />
        <h1>Types for recommendations</h1>
      </div>
      <Suspense fallback={"Loading available types"}>
        {(() => {
          const noId = createMemo(() => {
            const t = types();
            if (!t) return [];
            return t.filter(item => item.kind === "user_only").map(item => item.name);
          });

          const anyAmountOfIds = createMemo(() => {
            const t = types();
            if (!t) return [];
            return [
              ...new Set(
                t.filter(item => item.kind === "product" || item.kind === "multi_product").map(item => item.name)
              ),
            ];
          });

          return (
            <>
              <section>
                <h3>Accepts no id (general type, for frontpage etc)</h3>
                <br />
                <ol>
                  <Index each={noId()}>
                    {type => {
                      return <li>{type()}</li>;
                    }}
                  </Index>
                </ol>
              </section>
              <br />
              <br />
              <section>
                <h3>Accepts `productId` or `productIds` (one or multiple, for PDP or cart)</h3>
                <br />
                <ol>
                  <Index each={anyAmountOfIds()}>
                    {type => {
                      return <li>{type()}</li>;
                    }}
                  </Index>
                </ol>
              </section>
            </>
          );
        })()}
      </Suspense>
    </main>
  );
}
