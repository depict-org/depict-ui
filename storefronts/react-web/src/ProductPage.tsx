import React from "react";
import { Link } from "react-router-dom";

import { usePerformanceClient } from "@depict-ai/react-ui";

export function ProductPage() {
  const { dpc } = usePerformanceClient();
  dpc.setProductId("react-web-product-1234");

  return (
    <div className="container pdp-test">
      <h1 className="idle-text">This is the PDP</h1>
      <br />
      Introducing the [Product Name]! This [product type] is perfect for [target audience/use case]. With its [key
      feature 1], [key feature 2], and [key feature 3], it's sure to be a hit with anyone looking for a [product type].
      Made with [high-quality materials/sustainable practices], you can feel good about your purchase. Don't miss out on
      the opportunity to own your very own [Product Name] today!
      <p>
        <Link to={"/"}>Go to Front Page</Link>
      </p>
    </div>
  );
}
