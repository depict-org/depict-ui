import { depict_prefilled } from "./depict_tracking";
import { broadcast_product_id } from "./new_tab_click_emulator";
import { catchify, report } from "../logging/error";
import { href_change_ipns } from "../utilities/history";

interface TrackingData {
  /** The active market, if any */
  market?: string;
  /** The merchant id */
  tenant: string;
}

export interface PageViewEventData extends TrackingData {
  /** If the page is a pdp, include the product_id */
  product_id?: string;
}

export interface PageViewTrackingData extends TrackingData {
  /** A function that returns the product_id of the product being displayed on href,
   * if the href points to a PDP  */
  get_product_id: (href: string) => string | undefined | Promise<string | undefined>;
}

let last_page_pageview_sent_for: string;

/**
 * Sends a page_view event to Depict tracking if it hasn't been sent yet for the current page url
 * It also broadcasts the current URL to a BroadcastChannel using the function `broadcast_url`, this is used for right click + open in new tab tracking
 * @return   A promise resolving to void
 */
export async function send_page_view_if_needed(data: PageViewEventData) {
  // Send page view to depict if needed
  try {
    const { href } = location;
    if (last_page_pageview_sent_for !== href) {
      last_page_pageview_sent_for = href;
      depict_prefilled({
        ...data,
        type: "page_view",
      });

      if (data.product_id) {
        await broadcast_product_id(data.product_id); // this takes care of right click click attribution - broadcasts the URL of the current page
      }
    }
  } catch (error) {
    report([error, "Sending page view failed"], "warning");
  }
}

let sending_on_navigation = false;

/**
 * Sends a page_view event to Depict tracking, and another one any time the page URL changes
 */
export async function send_page_view_on_navigation(data: PageViewTrackingData) {
  if (!sending_on_navigation) {
    sending_on_navigation = true;
    catchify(async () => {
      for await (const _href of href_change_ipns) {
        send_page_view_if_needed({
          tenant: data.tenant,
          market: data.market,
          product_id: await data.get_product_id(_href),
        });
      }
    })();
  }
}
