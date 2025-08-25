// @ts-nocheck
import Link from "next/link";
import { useRouter } from "next/router";
import React from "react";
import { useFetchRecommendations, RecommendationGrid } from "@depict-ai/react-ui/latest";

import Layout from "../../components/Layout";
import { Title } from "../../components/Title";
import { ProductCard } from "../../components/ProductCard";
import { NewStrongerDisplay } from "../../from-depict/SearchDisplay";

export default function Home() {
  const router = useRouter();
  let { market } = router.query;
  market ||= "se"; // market can change dynamically anyway, better to SSR swedish version and then switch to SSR 404 since next is buggy, see https://github.com/vercel/next.js/discussions/11484

  if (market !== "se" && market !== "de" && market !== "gb") {
    return (
      <div>
        <Title>
          <Link href="/">404</Link>
        </Title>
      </div>
    );
  }


  return (
    <Layout title="Home">
      <Title>This would be the landing page.</Title>
      <Link href={`/${market}/category/33f308d3-5e80-4fcb-b5c5-b98325ea27fd`} className="test-category-page">
        Category everyday use
      </Link>
      <Recommendations />
    </Layout>
  );
}

function Recommendations() {
  const [recs, setRecs] = React.useState<Promise<NewStrongerDisplay[]>>(new Promise<NewStrongerDisplay[]>(() => {}));
  const { fetchRecommendations } = useFetchRecommendations<NewStrongerDisplay>();

  React.useEffect(() => {
    setRecs(fetchRecommendations({ type: "trending" }));
  }, [fetchRecommendations]);

  return (
    <>
      <h2>Trending</h2>
      <RecommendationGrid recommendations={recs} productCard={ProductCard} viewMoreButton={{text: "View more"}} gridSpacing={"2%"} />
    </>
  );
}
