// @ts-nocheck
import { TextPlaceholder, ImagePlaceholder, RecommendationGrid, RecommendationSlider } from "@depict-ai/react-ui/latest";
import { useFetchRecommendations } from "@depict-ai/react-ui/latest";

import Layout from "../../components/Layout";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "../../components/ProductCard";

export default function Placeholders() {
  const [extraWidth, setExtraWidth] = useState(0);

  const aspectRatio = useMemo(() => {
    return 0.5 + extraWidth / 10;
  }, []);

  const [recs, setRecs] = useState(new Promise(r => {}));
  const {fetchRecommendations} = useFetchRecommendations();

  useEffect(() => {
     setRecs(fetchRecommendations({
       type: "trending",
     }))
  }, [fetchRecommendations]);

  console.log(recs)

  return (
    <Layout title="Product Page">

      <button onClick={() => setExtraWidth(extraWidth + 1)}>Add width (from react)</button>
      <p>
        Hi this is an inline text <TextPlaceholder height="1ch" width={`${20 + extraWidth}ch`} />
      </p>
      <p>
        And this is a block <ImagePlaceholder width={`${20 + extraWidth}ch`} height={"20ch"} />
      </p>
      <div style={{ width: "500px", backgroundColor: "grey", padding: "10px" }}>
        And here we have an image in a fake "product card", aspect ratio {aspectRatio}
        <ImagePlaceholder aspectRatio={aspectRatio} />
      </div>
      <RecommendationGrid recommendations={recs} productCard={ProductCard} viewMoreButton={{text: "View more"}} gridSpacing={aspectRatio + "%"} />
      <RecommendationSlider recommendations={recs} productCard={ProductCard} gridSpacing={aspectRatio + "%"} />
    </Layout>
  );
}
