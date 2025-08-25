import { DPC as imported_DPC } from "@depict-ai/js-ui";

export async function runDPCTest() {
  localStorage.debug = true;
  const dpc_source = new URLSearchParams(location.search).get("dpc-source");
  if (dpc_source === "package") {
    return await test_dpc(imported_DPC);
  } else if (dpc_source === "cdn") {
    let resolve_dpc: (dpc: any) => void;
    const DPC = new Promise<typeof imported_DPC>(resolve => (resolve_dpc = resolve));
    let resolve_old_dpc: (dpc: any) => void;
    const old_DPC = new Promise<typeof imported_DPC>(resolve => (resolve_old_dpc = resolve));
    Object.assign(window, { resolve_dpc: resolve_dpc!, resolve_old_dpc: resolve_old_dpc! });
    const script1 = // Currently recommended import, see `/external-documentation and https://docs.depict.ai/api-guide/tracking/importing
      (
        <script type="module">
          import {"{ DPC }"} from "https://esm.run/@depict-ai/dpc@1.0/ES10"; resolve_dpc(DPC);
        </script>
      );
    const script2 = // old style import that CLN uses, just test that it still exists
      (
        <script type="module">
          {`
        const dpc = await import( "https://esm.run/@depict-ai/dpc@1.0/dist/module.js");
        resolve_old_dpc(dpc.DPC);
        `}
        </script>
      );
    document.head.append(script1, script2);
    if (typeof (await old_DPC) !== "function") {
      throw new Error("can't CDN load DPC from old style import");
    }
    return await test_dpc(await DPC);
  }
  throw new Error("dpc-source query param must be either 'package' or 'cdn'");
}

async function test_dpc(DPC: typeof imported_DPC) {
  const dpc = new DPC("catjam", { market: "test" });
  dpc.setSessionId("vanilla-js-session-1234");
  window.dpq("setProductId", "1234");
  console.log(dpc);

  dpc.sendPurchaseEvent({
    transaction_id: "123",
    currency: "EUR",
    items: [
      { item_id: "abc", "price": 24.5, quantity: 1 },
      { item_id: "abd", "price": 24, quantity: 1 },
    ],
  });
  window.dpq("purchase", {
    transaction_id: "1234",
    currency: "EUR",
    items: [{ item_id: 1234, "price": 0, quantity: 10 }],
  });

  const a2c_button = <button class="depict-add-to-cart">Add to cart</button>;
  const product = (
    <a data-product-listing-result-id="7ad3110d-7cd6-4352-83da-b93fa1bfe645" href="javascript:void(0)">
      Hi I'm a product
    </a>
  );

  document.body.prepend(product, a2c_button);

  await new Promise(r => setTimeout(r));
  a2c_button.click();
  await new Promise(r => setTimeout(r));

  product.click();

  // TODO: verify that events got sent via Tinybird

  return true;
}
