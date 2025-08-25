import React from "react";
import { SearchPage } from "@depict-ai/react-ui";
import { ProductCard } from "./ProductCard";

export function SearchResultsPage() {
  return (
    <div>
      <SearchPage productCard={ProductCard} />
    </div>
  );
}
