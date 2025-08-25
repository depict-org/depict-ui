import React from "react";
import { CategoryPage } from "@depict-ai/react-ui";
import { ProductCard } from "./ProductCard";
import { useLocation } from "react-router-dom";

// A custom hook that builds on useLocation to parse
// the query string for you.
function useQuery() {
  const { search } = useLocation();

  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export function CategoryListingPage() {
  const query = useQuery();
  const listingId = query.get("id");
  if (!listingId) return <div>Invalid category</div>

  return (
    <div>
      <h1>{`Showing category ${query.get("id")}`}</h1>
      <CategoryPage listingQuery={{id: listingId, type: "listingId"}} productCard={ProductCard} />
    </div>
  );
}
