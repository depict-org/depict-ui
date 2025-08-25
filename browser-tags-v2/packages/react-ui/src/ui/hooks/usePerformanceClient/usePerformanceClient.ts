import { DPC } from "@depict-ai/dpc";
import { globalState } from "../../../global_state";
import { UsePerformanceClientReturn } from "./usePerformanceClient.types";

/**
 * Hook used to access the Depict Performance Client.
 * Calls on the returned DPC instance can not be done server side.
 * @example
 * Send an add-to-cart event
 * ```tsx
 * import { useEffect } from "react";
 * import { usePerformanceClient } from "@depict-ai/react-ui";
 *
 * const ProductPage = ({ productId }) => {
 *   const { dpc } = usePerformanceClient();
 *
 *   useEffect(() => {
 *     dpc.setProductId(productId);
 *   }, [dpc, productId]);
 *
 *   return <div>Showing product {productId}</div>;
 * }
 * ```
 * @returns {UsePerformanceClientReturn}
}
 */
export const usePerformanceClient = (): UsePerformanceClientReturn => {
  if (!globalState.dpc) {
    throw new Error("Depict tracking is not configured. Wrap your app in a DepictProvider.");
  }

  return {
    dpc: globalState.dpc,
  };
};

export const setup_performance_client = (merchant?: string, market?: string, sessionId?: string) => {
  if (!merchant) return;

  try {
    let { dpc } = globalState;
    if (!dpc) {
      dpc = globalState.dpc = new DPC(merchant, { market });
    }

    dpc.merchant = merchant;
    dpc.market = market;
    dpc.setSessionId(sessionId);
  } catch (e) {
    // Make sure to not break the users app if we throw
    queueMicrotask(() => {
      throw e;
    });
  }
};
