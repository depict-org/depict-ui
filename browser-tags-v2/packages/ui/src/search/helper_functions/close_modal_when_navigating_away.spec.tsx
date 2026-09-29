import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createRoot } from "solid-js";

jest.mock("@depict-ai/utilishared", () => {
  // Never yields, like href_change_ipns when nothing changes location.href
  const silent_iterable = { [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => {}) }) };
  return {
    catchify: (fn: any) => fn,
    dwarn: jest.fn(),
    report: jest.fn(),
    href_change_ipns: silent_iterable,
    make_asyncIterable_exiter: (iterable: any) => [() => {}, iterable],
    instant_exec_on_suspect_history_change: new Set(),
  };
});

import { instant_exec_on_suspect_history_change } from "@depict-ai/utilishared";
import { close_modal_when_navigating_away } from "./close_modal_when_navigating_away";
import { OnNavigation, PseudoRouter } from "../../shared/helper_functions/pseudo_router";

const fire_history_change = (what_happened: "replaceState" | "pushState") =>
  [...(instant_exec_on_suspect_history_change as Set<(what_happened?: string) => void>)].forEach(handler =>
    handler(what_happened)
  );

const advance_time = async (ms: number) => {
  jest.advanceTimersByTime(ms);
  // Let the promise callbacks that the timers resolved run
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

const product_page = "/sv-se/regular-fit-kritstrecksrandiga-ullbyxor-54881927-brun-590";
// What the instant card links to on a storefront whose router adds the locale prefix itself
const card_href = "/regular-fit-kritstrecksrandiga-ullbyxor-54881927-brun-590";

describe("closing the search modal after following a link inside it", () => {
  let close_modal: jest.Mock;
  let dispose: VoidFunction;

  const open_modal_with_router = (on_navigation: OnNavigation) => {
    const router_ = new PseudoRouter(on_navigation);
    dispose = createRoot(dispose => {
      close_modal_when_navigating_away(close_modal, "query", router_);
      return dispose;
    });
    return router_;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    history.replaceState(null, "", product_page);
    close_modal = jest.fn();
  });

  afterEach(() => {
    dispose();
    jest.useRealTimers();
  });

  it("closes when the card links to the page the shopper is already on", async () => {
    const router_ = open_modal_with_router(() => {
      // The storefront router resolves the card to the current page and only replaces the history entry
      history.replaceState(null, "", product_page);
      fire_history_change("replaceState");
    });
    await router_.navigate_.go_to_({ new_url_: card_href, is_replace_: false });
    await advance_time(0);
    expect(location.pathname).toBe(product_page);
    expect(close_modal).toHaveBeenCalledTimes(1);
  });

  it("closes when the storefront router ignores a navigation to the current page", async () => {
    const router_ = open_modal_with_router(() => {});
    router_.navigate_.go_to_({ new_url_: card_href, is_replace_: false });
    await advance_time(499);
    expect(close_modal).not.toHaveBeenCalled();
    await advance_time(1);
    expect(close_modal).toHaveBeenCalledTimes(1);
  });

  it("leaves closing to the href change when the navigation lands on another page", async () => {
    const router_ = open_modal_with_router(() => {
      history.pushState(null, "", "/sv-se/another-product");
      fire_history_change("pushState");
      fire_history_change("replaceState");
    });
    await router_.navigate_.go_to_({ new_url_: "/another-product", is_replace_: false });
    await advance_time(500);
    expect(close_modal).not.toHaveBeenCalled();
  });

  it("stops listening once the modal is gone", async () => {
    const router_ = open_modal_with_router(() => fire_history_change("replaceState"));
    dispose();
    await router_.navigate_.go_to_({ new_url_: card_href, is_replace_: false });
    await advance_time(500);
    expect(close_modal).not.toHaveBeenCalled();
  });
});
