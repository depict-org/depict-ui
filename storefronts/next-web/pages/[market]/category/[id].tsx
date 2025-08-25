// @ts-nocheck
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import { CategoryPage, CategoryTitle } from "@depict-ai/react-ui/latest";
import { ProductCard } from "../../../components/ProductCard";
import { useState } from "react";

export default function Category() {
  const router = useRouter();
  const { id } = router.query;
  const [quicklinks, set_quicklinks] = useState(true);
  const [breadcrumbs, set_breadcrumbs] = useState(true);

  return (
    <Layout title={"Category Page"} merchant={"stronger"}>
      <h1>This is category {id}</h1>
      <button onClick={() => set_quicklinks(!quicklinks)}>Toggle quick links</button>
      <button onClick={() => set_breadcrumbs(!breadcrumbs)}>Toggle breadcrumbs</button>
      <CategoryPage
        categoryTitlePlugin={CategoryTitle}
        listingQuery={{id: id, type: "listingId"}}
        productCard={ProductCard}
        gridSpacing="2%"
        columnsAtSize={[[4], [3, 1024], [2, 901]]}
        showBreadcrumbs={breadcrumbs}
        showQuicklinks={quicklinks}
        contentBlocksByRow={[
          ,
          {
            content: () => (
              <div style={{ color: "white" }}>I'm a content block. Quicklinks: {JSON.stringify(quicklinks)}</div>
            ),
            spanColumns: quicklinks ? 3 : 1,
            spanRows: breadcrumbs ? 2 : 1,
            position: "left",
          },
        ]}
      />
    </Layout>
  );
}
