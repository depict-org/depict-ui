import { ClientFunction, fixture, Selector, test } from "testcafe";
import try_until from "../utils/try_until";
import {
  breadcrumbHash,
  confirmSPACheck,
  ensurePageHasLoaded,
  getStoreConfig,
  initSPACheck,
  quickLinkHash,
} from "./helper";
import { modalOpensAlignedTest } from "./modal/modal-opens-aligned";
import { modalOpensCenteredTest } from "./modal/modal-opens-centered";

const { store, store_path } = getStoreConfig();

fixture(store_path).page(`http://127.0.0.1:3000${store.url_path}`);

const rs = ".depict.plp ";

const getViewport = ClientFunction(() => {
  const windowHeight = window.innerHeight;
  const windowWidth = window.innerWidth;

  return {
    windowWidth,
    windowHeight,
    documentWidth: document.documentElement.clientWidth,
    documentHeight: document.documentElement.clientHeight,
  };
});

const goBack = ClientFunction(() => window.history.back());
const goForward = ClientFunction(() => window.history.forward());

const testCardTrackingIds = async (tc: TestController, cards: Selector, tracking_id_attribute: string) => {
  const card_count = await cards.count;
  const tracking_ids = new Set<string>();

  for (let i = 0; i < card_count; i++) {
    const tracking_id = await cards.nth(i).getAttribute(tracking_id_attribute);
    await tc.expect(tracking_id).typeOf("string");
    await tc.expect(tracking_id).notEql("");
    await tc.expect(tracking_ids.has(tracking_id!)).notOk();
    tracking_ids.add(tracking_id!);
  }
  await tc.expect(tracking_ids.size).eql(card_count);

  return card_count;
};

const testInViewport = async (tc: TestController, element_selector: Selector, error_message: string) => {
  const element = await element_selector();
  const rect = await element.boundingClientRect;
  await tc.expect(rect).notTypeOf("undefined");

  const viewport = await getViewport();
  const in_viewport =
    rect!.bottom > 0 &&
    rect!.right > 0 &&
    rect!.left < (viewport.windowWidth || viewport.documentWidth) &&
    rect!.top < (viewport.windowHeight || viewport.documentHeight);

  await tc.expect(in_viewport).ok(error_message);
};

export const testResultsPage = async (
  tc: TestController,
  card_tracking_attribute: string,
  check_content_blocks_if_enabled: boolean
) => {
  const results_container = Selector(`${rs}.listing-page .PLP-results`);
  const results_cards = results_container.find(`.cards > div:not(.content-block-wrapper)`);
  const pdp = Selector(store.selectors.pdp_content);

  // Wait for first results to load
  await try_until({
    t: tc,
    until: async () => (await results_cards.count) >= 10,
  });

  const first_results_count = await testCardTrackingIds(tc, results_cards, card_tracking_attribute);
  await tc.expect(first_results_count).gte(10);

  // Load more on scroll
  await try_until({
    t: tc,
    to_try: async () => tc.scrollBy(0, 1000),
    until: async () => (await results_cards.count) > first_results_count,
  });

  const more_results_count = await results_cards.count;
  await tc.expect(more_results_count).gt(first_results_count);

  // Scroll restoration after visiting a PDP far down the list
  if (!store.skipNavigationBased) {
    const placeholders = results_container.find(`.depict-placeholder`);
    const scroll_to_n = more_results_count - 8;
    const scroll_card = results_cards.nth(scroll_to_n);
    await tc.scrollIntoView(scroll_card);

    // Wait for browser to have become idle to ensure the intersection observers have ran and saved the scroll restoration data
    await tc.eval(() => new Promise(r => requestIdleCallback(r, { timeout: 60 * 1000 })));
    await tc.wait(1000);

    const logstr1 =
      "Index when leaving page: " +
      JSON.stringify(await tc.eval(() => window.scrollY)) +
      ", scroll restoration data: " +
      (await tc.eval(() =>
        JSON.stringify(
          history?.state?.category_scroll_restoration_data || history?.state?.search_scroll_restoration_data
        )
      ));

    // Test Back to index -> Forward to results listing
    await goBack();
    await tc.wait(100); // Give react time to finish rendering and run shit
    // Wait for navigation away from results page to index page
    await try_until({
      t: tc,
      until: async () => !(await scroll_card.exists),
    });

    await goForward();
    await tc.wait(100); // Give react time to finish rendering and run shit
    await try_until({
      t: tc,
      until: async () => !(await placeholders.exists),
    });

    await tc.expect(placeholders.exists).notOk();
    await try_until({
      t: tc,
      until: async () => !!(await results_cards.count),
    });
    await tc.expect(results_cards.count).gt(scroll_to_n);
    const logstr2 =
      "Index after returning to page: " +
      JSON.stringify(await tc.eval(() => window.scrollY)) +
      ", scroll restoration data: " +
      (await tc.eval(() =>
        JSON.stringify(
          history?.state?.category_scroll_restoration_data || history?.state?.search_scroll_restoration_data
        )
      ));
    await testInViewport(
      tc,
      scroll_card,
      `Product card with index ${scroll_to_n} not in view after going back to index -> forward to results\n${logstr1}\n${logstr2}`
    );

    // Test Clicking PDP link -> Back to results listing
    const spa_key = await initSPACheck(tc);
    await tc.click(scroll_card.find("a"));
    // Wait for navigation away from search results page to PDP
    await try_until({
      t: tc,
      until: async () => !(await scroll_card.exists) && (await pdp.exists),
    });
    await confirmSPACheck(
      tc,
      spa_key,
      store.spa,
      "SPA check failed when clicking PDP link. Has happened before with React <Link> components."
    );

    await goBack();
    await try_until({ t: tc, until: async () => !(await placeholders.exists) });

    await tc.expect(placeholders.exists).notOk();
    await tc.expect(results_cards.count).gt(scroll_to_n);
    await testInViewport(tc, scroll_card, "Product card not in view after clicking PDP -> back to results");
  }

  if (check_content_blocks_if_enabled && store.look_for_content_blocks) {
    const content_blocks = results_container.find(`.content-block-wrapper`);
    await tc.expect(content_blocks.count).gt(0);
  }

  // No filter should be selected by default
  const selected_filters = Selector(`${rs}.selected-filters`);
  await tc.expect(selected_filters.exists).notOk();

  // Toggle + expand / collapse filter
  // Filters open the same way regardless of screen size
  const filters_toggle = Selector(`${rs}.sort-and-filter-buttons:not(.fake) .filter.toggle-button`);
  const filters_section = Selector(`${rs} .filters`);
  await tc.click(filters_toggle);

  await try_until({
    t: tc,
    until: async () => filters_section.exists,
  });
  await tc.expect(filters_section.exists).ok();
  await tc.expect(filters_section.visible).ok();

  const first_checkbox_filter = Selector(`${rs}.filters .filter-collapsible input[type=checkbox]`);
  const filter_container = first_checkbox_filter.parent(".filter-collapsible");
  const filter_toggle = filter_container.find(".filter-group-summary");
  const filter_body = filter_container.find(".filter-collapsible-body");

  await tc.expect(filter_body.visible).notOk();
  await tc.click(filter_toggle).wait(200); // Animation delay
  await tc.expect(filter_body.visible).ok();

  // The HTML input itself is hidden, but the entire container is clickable
  await tc.click(first_checkbox_filter.parent());

  await tc.click(filter_toggle);
  await tc.expect(filter_body.visible).notOk();

  // Filters close differently on desktop/mobile (sidebar / modal)
  const mobile_close = Selector(`${rs}.dismiss-modal`);
  if (await mobile_close.exists) {
    await tc.click(mobile_close);
  } else {
    await tc.click(filters_toggle);
  }

  await tc.expect(filters_section.exists).notOk();

  // Now that the filter section is closed after selecting the first checkbox, the list of selected filters should be visible
  await tc.expect(selected_filters.exists).ok();
  await tc.expect(selected_filters.visible).ok();

  // Filters restoration after visiting a PDP
  if (!store.skipNavigationBased) {
    const first_card = results_cards.nth(0);
    ensurePageHasLoaded(tc);
    await tc.click(first_card.find("a"));

    // Wait for navigation away from search results page
    await try_until({
      t: tc,
      until: async () => !(await first_card.exists) && (await pdp.exists),
    });

    await goBack();

    // Our previously selected checkbox filter should still be selected after navigating back and forth
    await tc.expect(selected_filters.exists).ok();
    await tc.expect(selected_filters.visible).ok();
  }
};

if (store.test_dpc) {
  test("DPC can be loaded, constructed and called from esm.run and package", async t => {
    // Create a client function to execute the window.TEST_DPC() function in the context of the browser
    const executeDpcFunction = ClientFunction(() => {
      // @ts-ignore
      return window.TEST_DPC();
    });

    await t.navigateTo("/?dpc-source=package");

    // Execute the function and get the result
    const package_result = await executeDpcFunction();

    console.log("Executing stuff in browser yielded", package_result);

    // Assert that the result is true
    await t.expect(package_result).eql(true);

    await t.navigateTo("/?dpc-source=cdn");

    // Execute the function and get the result
    const cdn_result = await executeDpcFunction();

    console.log("Executing stuff in browser yielded", cdn_result);

    // Assert that the result is true
    await t.expect(cdn_result).eql(true);
  });
}

if (store.test_next_modal_navigation) {
  test("Next.js modal to product navigation", async tc => {
    // This test is worthless because the next router in next-web for some reason navigates to the correct page even if shallow is incorrectly set to true. I wrote it with good intentions though.
    const spa_key = await initSPACheck(tc);
    await tc.click(Selector(store.selectors.open_modal));

    const search_field = Selector(`${rs}.depict-search-modal .search-field`);
    const instant_cards = Selector(`${rs}.instant-results .instant-card`);

    await tc.typeText(search_field, store.query, { replace: true });

    // Search can be really slow sometimes
    await try_until({
      t: tc,
      until: async () => (await instant_cards.count) > 0,
    });

    const instant_cards_count = await testCardTrackingIds(tc, instant_cards, "data-search-result-id");

    await tc.expect(instant_cards_count).gte(2);

    await tc.click(instant_cards.child(0));

    await try_until({
      t: tc,
      to_try: () => new Promise(r => setTimeout(r, 100)),
      until: () => Selector(`.fake-product-page`).exists,
    });

    // TODO: Fix this
    // await tc.expect(Selector(`.fake-product-page`).textContent).eql("This is the fake product page");

    await goBack();

    // Up until this point, no full page reloads should have happened, regardless if the store is SPA or not
    await confirmSPACheck(
      tc,
      spa_key,
      true,
      "Full page reload happened between opening the Search modal -> Results page -> Back to index"
    );
  });
}

test("Next.js scroll restoration padding", async tc => {
  // Checks for a glitch in scroll restoration + Next.js,
  // where our padding is inserted but never removed if the Next router pushes an identical route
  const body = Selector("body");
  const initial_body_height = await body.getBoundingClientRectProperty("height");

  await tc.eval(() => (window as any).next?.router.push(document.location.href));

  let body_height: number;
  await try_until({
    t: tc,
    until: async () => (body_height = await body.getBoundingClientRectProperty("height")) === initial_body_height,
  });
  await tc.expect(body_height!).eql(initial_body_height);

  // MD does this weird replace call, see https://gitlab.com/depict-ai/depict.ai/-/merge_requests/6549#note_1361842733
  await tc.eval(() => (window as any).next?.router.replace(location.pathname, undefined, { shallow: true }));

  await try_until({
    t: tc,
    until: async () => (body_height = await body.getBoundingClientRectProperty("height")) === initial_body_height,
  });
  await tc.expect(body_height!).eql(initial_body_height);
});

test("Search", async tc => {
  const spa_key = await initSPACheck(tc);
  await tc.click(Selector(store.selectors.open_modal));

  const search_field = Selector(`${rs}.depict-search-modal .search-field`);
  const instant_cards = Selector(`${rs}.instant-results .instant-card`);

  await tc.typeText(search_field, "RANDOMSTRINGWITHNORESULTSFORDEPICTTEST");
  await tc.expect(instant_cards.count).eql(0);

  if (store.selectors.modal_aligner) {
    await modalOpensAlignedTest(tc, store.selectors.modal_aligner);
  } else {
    await modalOpensCenteredTest(tc);
  }

  await tc.typeText(search_field, store.query, { replace: true });

  // Search can be really slow sometimes
  await try_until({
    t: tc,
    until: async () => (await instant_cards.count) > 0,
  });

  const instant_cards_count = await testCardTrackingIds(tc, instant_cards, "data-search-result-id");

  await tc.expect(instant_cards_count).gte(2);

  await tc.click(Selector(`${rs}.discover-more button`));

  // Up until this point, no full page reloads should have happened, regardless if the store is SPA or not
  await confirmSPACheck(
    tc,
    spa_key,
    true,
    "Full page reload happened between opening the Search modal -> Results page"
  );

  // TODO: Find better query to check for results
  // await tc.expect((await Selector(".content-results .results-for").textContent).length).gt(0);
  // await tc.expect(Selector(".content-results .content-card").count).gt(0);

  await testResultsPage(tc, "data-search-result-id", false);

  await tc.click(Selector(store.selectors.open_modal));
  // await tc.expect(Selector(".depict-search-modal .suggestions .suggestion.type-content").exists).ok();

  await confirmSPACheck(tc, spa_key, store.spa, "SPA check failed on Search results page");
});

test("Category page", async tc => {
  await tc.click(".test-category-page");
  const spa_key = await initSPACheck(tc);

  const title = Selector(`${rs}.category-title .title`);

  // Category information requires API response
  await try_until({
    t: tc,
    until: async () => !(await title.find(".depict-placeholder").exists),
  });

  const initial_title = await title.innerText;

  const quicklinks = Selector(`${rs}.quicklinks a.quicklink`);
  const initial_quicklink_hash = await quickLinkHash(quicklinks);

  const breadcrumbs = Selector(`${rs}.crumbs a.crumb`);
  const initial_breadcrumb_hash = await breadcrumbHash(breadcrumbs);

  await tc.expect(quicklinks.count).gt(0);
  await tc.click(quicklinks.filter(":not(.selected)").nth(0));

  // Breadcrumbs update after API response
  await try_until({
    t: tc,
    until: async () => (await breadcrumbHash(breadcrumbs)) !== initial_breadcrumb_hash,
  });

  // Clicking a quicklink should navigate us to a different category

  await try_until({
    t: tc,
    until: async () => (await title.innerText) !== initial_title,
  });
  await tc.expect(title.innerText).notEql(initial_title);

  await try_until({
    t: tc,
    until: async () => (await quickLinkHash(quicklinks)) !== initial_quicklink_hash,
  });
  await tc.expect(await quickLinkHash(quicklinks)).notEql(initial_quicklink_hash);

  await tc.expect(await breadcrumbHash(breadcrumbs)).notEql(initial_breadcrumb_hash);

  await goBack();

  // Going back should bring us back to the original category
  await tc.expect(title.innerText).eql(initial_title);
  await tc.expect(await quickLinkHash(quicklinks)).eql(initial_quicklink_hash);
  await tc.expect(await breadcrumbHash(breadcrumbs)).eql(initial_breadcrumb_hash);

  // Click a quicklink to "ensure" we have multiple breadcrumbs to choose from
  await tc.click(quicklinks.filter(":not(.selected)").nth(0));

  if ((await breadcrumbs.count) > 1) {
    const sub_title = await title.innerText;
    const sub_quicklink_hash = await quickLinkHash(quicklinks);
    const sub_breadcrumb_hash = await breadcrumbHash(breadcrumbs);

    await tc.click(breadcrumbs.nth(0));

    // Breadcrumbs update after API response
    await try_until({
      t: tc,
      until: async () => (await breadcrumbHash(breadcrumbs)) !== sub_breadcrumb_hash,
    });

    // Clicking a breadcrumb should navigate us to a different category
    await tc.expect(title.innerText).notEql(sub_title);
    await tc.expect(await quickLinkHash(quicklinks)).notEql(sub_quicklink_hash);
    await tc.expect(await breadcrumbHash(breadcrumbs)).notEql(sub_breadcrumb_hash);

    await goBack();

    // Going back should bring us back to the quicklink category
    await tc.expect(title.innerText).eql(sub_title);
    await tc.expect(await quickLinkHash(quicklinks)).eql(sub_quicklink_hash);
    await tc.expect(await breadcrumbHash(breadcrumbs)).eql(sub_breadcrumb_hash);
  }

  // Go back to the intial category, regardless if we did a breadcrumb test or not
  await goBack();

  // Up until this point, no full page reloads should have happened, regardless if the store is SPA or not
  await confirmSPACheck(tc, spa_key, true, "Full page reload happened in Category quicklinks or breadcrumbs");

  await testResultsPage(tc, "data-product-listing-result-id", true);
  await confirmSPACheck(tc, spa_key, store.spa, "SPA check failed on Category results page");
});

if (store.test_placeholders) {
  test("Placeholder page", async tc => {
    await tc.navigateTo("/se/placeholders");

    await tc.expect(Selector(`.depict-placeholder`).count).gt(1);
    await tc.expect(Selector(`.depict-placeholder`).filterVisible().count).gt(1);
  });
}
