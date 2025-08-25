import {
  base_url,
  catchify,
  depict_body,
  depict_click,
  derror,
  dlog,
  ElementObserverEvent,
  foolproof_send_beacon,
  get_session_id,
  get_tracking_event_context_data,
  impression_track_element,
  instant_exec_on_suspect_history_change,
  observer,
  send_depict_unfiltered,
} from "@depict-ai/utilishared";
import { PurchasedProduct, TrackV2Request } from "@depict-ai/types/api/TrackV2Request";
import { a2c_selector, product_card_tracking_id_attributes } from "./selectors";
import { setup_dpq } from "./setup_dpq";
import { GA4Purchase, ProductCardType, tracking_keys, TrackingKey } from "./types";

export interface Options {
  /**
   * The initial market. Should be specified if the market is known at the point of intializing DPC.
   */
  market?: string;
  /**
   * If we should observe for recommendations on creation. If false, you must call `trackRecommendationCard` manually.
   */
  auto_observe?: boolean;
}

export class PerformanceClient {
  merchant: string;
  auto_observe = true;
  market?: string;

  /** Latest product_id found in the DOM. Used in a2c & pageview events on PDPs. */
  latest_product_id?: string;
  /** The value of location.pathname when latest_product_id was set  */
  latest_product_id_path?: string;
  /** Latest session_id set on the client. Used for all events. */
  latest_session_id?: string;
  /** if we've sent a page view event for the current href */
  #has_sent_pageview_for_current_href = false;

  constructor(merchant: string, options?: Options) {
    // Make sure we do not construct dpc more than once.
    if (window.depict?.dpc instanceof PerformanceClient) {
      dlog("DPC already initialized. Returning existing instance.");
      return window.depict.dpc;
    }

    this.merchant = merchant;
    this.#parseOptions(options);
    setup_dpq(this);
    this.#resetSentPageViewForCurrentHref();

    if (this.auto_observe) {
      this.observeRecommendations();
      this.observePDPA2CButton();
    }
  }

  #resetSentPageViewForCurrentHref() {
    let url = location.href;
    instant_exec_on_suspect_history_change.add(
      catchify(() => {
        const { href: new_href } = location;
        if (url !== new_href) {
          this.#has_sent_pageview_for_current_href = false;
          url = new_href;
        }
      })
    );
  }

  #parseOptions(options?: Options) {
    if (options !== undefined) {
      if (options.auto_observe !== undefined) {
        this.auto_observe = options.auto_observe;
      }
      if (options.market !== undefined) {
        this.market = options.market;
      }
    }
  }

  #getContextData() {
    const data = {
      market: this.market,
      tenant: this.merchant,
      session_id: this.latest_session_id || get_session_id(),
    };
    return { ...get_tracking_event_context_data(), ...data };
  }

  tracked_elements = new WeakSet<HTMLElement>();
  /**
   * Make sure the tracking is not set up twice on the same element.
   */
  checkIfTracked(element: HTMLElement) {
    if (this.tracked_elements.has(element)) {
      dlog("Already tracked", element);
      return true;
    }
    this.tracked_elements.add(element);
    return false;
  }

  /**
   * Adds click and impression tracking to a product card
   */
  trackProductCard(card: HTMLElement, tracking_id: string, type: ProductCardType) {
    if (this.checkIfTracked(card)) return;

    switch (type) {
      case ProductCardType.Recommendation:
      case ProductCardType.SnakeRecommendation:
        card.addEventListener("click", () => this.sendRecommendationClickEvent(tracking_id));
        // impression_track_element({
        //   element: card,
        //   data: { recommendation_id: tracking_id, ...this.#getContextData() },
        // });
        break;
      case ProductCardType.SearchResult:
        card.addEventListener("click", () => this.sendSearchResultClickEvent(tracking_id));
        // impression_track_element({
        //   element: card,
        //   data: { search_result_id: tracking_id, ...this.#getContextData() },
        // });
        break;
      case ProductCardType.ProductListingResult:
        card.addEventListener("click", () => this.sendProductListingResultClickEvent(tracking_id));
        // impression_track_element({
        //   element: card,
        //   data: { product_listing_result_id: tracking_id, ...this.#getContextData() },
        // });
        break;
    }

    // If the card has optional a2c buttons, we track those as well.
    const a2c_buttons = card.querySelectorAll<HTMLElement>(a2c_selector);
    for (const a2c_button of a2c_buttons) {
      this.trackAddToCartButton(a2c_button, card);
    }
  }

  /**
   * Adds tracking to an Add to cart button.
   */
  trackAddToCartButton(button: HTMLElement, productCard?: HTMLElement) {
    if (this.checkIfTracked(button)) return;

    button.addEventListener("click", () => {
      if (!productCard) {
        // If the button is not nested in a product card, it's a PDP button. Product ID set on the page is required.
        const product_id = this.#getProductId();

        if (!product_id) {
          derror("No product ID set for add-to-cart click outside of product card", button);
          return;
        }

        this.sendAddToCartEvent({ product_id });
        return;
      }

      // If the button is nested in a product card, we need to find the tracking ID. It can set in one of several attributes.
      for (const [attribute, type] of Object.entries(product_card_tracking_id_attributes)) {
        const tracking_id = productCard.getAttribute(attribute);
        if (!tracking_id) continue;

        const tracking_data = { [tracking_keys[type]]: tracking_id } as { [x in TrackingKey]: string };
        this.sendAddToCartEvent(tracking_data);
        return;
      }

      derror("Could not find tracking data for add-to-cart click on button", button);
    });
  }

  /**
   * Sends a tracking event to depict
   */
  #sendTrackingEvent(payload: depict_body) {
    // Todo. check consent. For some events, delay until consent decision, with possible timeout.
    // For others, decide immediately based on current consent. (We shouldn't track a long history of events from before the user consented)
    // If no consent, don't send at all, or send anonymous? I think the latter is valid, since no ID in cookie or localStorage.
    send_depict_unfiltered([{ ...payload, ...this.#getContextData() }], true);
  }
  /**
   * Sends an Add to Cart Event to depict
   * If the add to cart unmistakably happened due to a click on a product card shown because of Depict (for example the add to cart button on a product card), set recommendation_id / search_result_id / product_listing_result_id (whatever applicable). If it happened on a PDP, set product_id instead.
   */
  sendAddToCartEvent(data: { product_id?: string } & { [x in TrackingKey]?: string }) {
    this.#sendTrackingEvent({ type: "add_to_cart", ...data });
  }
  /**
   * Sends a recommendation impression event to Depict
   */
  sendRecommendationImpressionEvent(recommendation_id: string) {
    this.#sendTrackingEvent({ type: "element_visible", recommendation_id });
  }
  /**
   * Sends a search result impression event to Depict
   */
  sendSearchResultImpressionEvent(search_result_id: string) {
    this.#sendTrackingEvent({ type: "element_visible", search_result_id });
  }
  /**
   * Sends a product listing result impression event to Depict
   */
  sendProductListingResultImpressionEvent(product_listing_result_id: string) {
    this.#sendTrackingEvent({ type: "element_visible", product_listing_result_id });
  }
  /**
   * Sends a recommendation click event to Depict
   */
  sendRecommendationClickEvent(recommendation_id: string) {
    depict_click({ recommendation_id, ...this.#getContextData() });
  }

  /**
   * Sends a search result click event to Depict
   */
  sendSearchResultClickEvent(search_result_id: string) {
    depict_click({ search_result_id, ...this.#getContextData() });
  }

  /**
   * Sends a product listing result click event to Depict
   */
  sendProductListingResultClickEvent(product_listing_result_id: string) {
    depict_click({ product_listing_result_id, ...this.#getContextData() });
  }

  /**
   * Sends a Purchase Event to Depict
   */
  sendPurchaseEvent(data: GA4Purchase) {
    if (!this.market) {
      throw Error("Market not set");
    }

    const { session_id } = this.#getContextData();
    const items: PurchasedProduct[] = data.items.map(item => ({
      sku: item.item_id,
      price: item.price,
      quantity: item.quantity,
    }));

    const request: TrackV2Request = {
      events: [
        {
          event_type: "purchase",
          session_id,
          transaction_id: data.transaction_id,
          currency: data.currency,
          // This "At least one item" interface is too cumbersome to expose to end users, they get a plain array typing instead.
          products: items as [PurchasedProduct, ...PurchasedProduct[]],
        },
      ],
      tenant: this.merchant,
      market: this.market,
    };

    foolproof_send_beacon(base_url + "/v2/create-events", request);
  }
  /**
   * Update the market used for tracking events
   */
  setMarket(market: string) {
    this.market = market;
  }
  /**
   * Update the product_id used for add-to-cart and pageview events on PDPs.
   */
  setProductId(product_id: string) {
    dlog("Setting product id", product_id);

    this.latest_product_id = product_id;
    this.latest_product_id_path = location.pathname;

    if (!this.#has_sent_pageview_for_current_href) {
      this.#sendTrackingEvent({ type: "page_view", product_id });
      this.#has_sent_pageview_for_current_href = true;
    }
  }
  #getProductId() {
    if (this.latest_product_id_path !== location.pathname) return undefined;
    return this.latest_product_id;
  }
  /**
   * Set the current session_id.
   *
   * https://docs.depict.ai/docs/performance-client#browser-sessions
   */
  setSessionId(session_id?: string | null) {
    dlog("Setting session id", session_id);
    this.latest_session_id = session_id || undefined;
  }
  /**
   * Observe the DOM for recommendations to track
   */
  observeRecommendations() {
    for (const [attribute, type] of Object.entries(product_card_tracking_id_attributes)) {
      const selector = `[${attribute}]`;
      dlog("Starting to observe product cards with selector", selector);
      observer.onexists(selector, ({ element }) => {
        const tracking_id = element.getAttribute(attribute);

        if (!tracking_id) {
          derror(`No tracking id found on element with attribute ${selector}`, element);
          return;
        }

        this.trackProductCard(element, tracking_id, type);
      });
    }
  }
  /**
   * Observe the dom for add to cart buttons. Used on product detail pages.
   */
  observePDPA2CButton() {
    const handler = ({ element }: ElementObserverEvent) => {
      const depict_card_selector = Object.keys(product_card_tracking_id_attributes)
        .map(attribute => `[${attribute}]`)
        .join(",");
      // it's an add to cart button on a product card that possibly was added to the product card at a later point, if parent_depict_card is defined
      const parent_depict_card = element.closest<HTMLElement>(depict_card_selector) || undefined;

      dlog(`Found ${parent_depict_card ? "product card" : "pdp"} add-to-cart button`, element);
      this.trackAddToCartButton(element, parent_depict_card);
    };
    observer.onexists(a2c_selector, handler);
  }
}
