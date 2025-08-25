import { onExistsObserver, DPC } from "@depict-ai/js-ui";
import { merchant, market } from "./main";

export default function setupTrackingTest() {
  // Very basic test that DPC doesn't throw on initialization. If it does, testcafe will fail due to uncaught Javascript error.
  const dpc = new DPC(merchant, { market });
  dpc.setUserId("vanilla-js-user-1234");
  dpc.setSessionId("vanilla-js-session-1234");
  window.dpq("setProductId", "1234");
  console.log(dpc);

  // For manually testing that events make it all the way to our storage.
  onExistsObserver("#purchase", element => {
    element.addEventListener("click", () => {
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
    });
  });
}
