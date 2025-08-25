// @ts-nocheck
import { useEffect } from "react";
import { usePerformanceClient, LooksSliderOrGrid } from "@depict-ai/react-ui/latest";

import Layout from "../../components/Layout";

export default function Product() {
  return (
    <Layout title="Product Page">
      <ProductPage />
    </Layout>
  );
}

// I made a mistake by putting DepictProvider in the Layout component, which means pages are above the DepictProvider
// in the component tree and can't use Depict hooks safely. Quick workaround by doing another wrap...
function ProductPage() {
  const { dpc } = usePerformanceClient();

  useEffect(() => {
    dpc.setProductId("next-web-product-1234");
  }, [dpc]);

  return (
    <div className="pdp-test">
      <p>It has qualities and aspects to it</p>
      <h1>Looks</h1>
      <LooksSliderOrGrid productId="1015_9999-XXL" />
    </div>
  );
}
