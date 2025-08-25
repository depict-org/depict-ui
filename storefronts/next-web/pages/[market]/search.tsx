// @ts-nocheck
import { SearchPage } from "@depict-ai/react-ui/latest";
import { ProductCard } from "../../components/ProductCard";
import Layout from "../../components/Layout";
import { useState } from "react";

export default function SearchResultsage() {
  const [cols, set_cols] = useState(0);
  return (
    <Layout title={"Search Page"} merchant={"stronger"}>
      <button onClick={() => set_cols(cols + 1)}>Add column</button>
      <button onClick={() => set_cols(cols - 1)}>Remove column</button>
      <SearchPage
        productCard={ProductCard}
        gridSpacing="2%"
        columnsAtSize={[[4 + cols], [cols + 3, 1024], [cols + 2, 901]]}
      />
    </Layout>
  );
}
