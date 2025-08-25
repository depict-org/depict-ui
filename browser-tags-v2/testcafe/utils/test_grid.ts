import { Selector, test } from "testcafe";

export function test_grid({
  num_grids,
  with_view_more = true,
  view_more_debug = false,
  container_selector = ".depict.recommendation_container",
  card_selector = ".rec_outer",
  view_more_selector = ".load-more-container button.load_more",
  min_cards = 2,
  num_cont_comp_fn = "eql",
}: {
  num_grids: number;
  with_view_more?: boolean;
  view_more_debug?: boolean;
  container_selector?: string;
  card_selector?: string;
  view_more_selector?: string;
  min_cards?: number;
  num_cont_comp_fn?: "eql" | "notEql" | "gt" | "gte" | "lt" | "lte";
}) {
  const get_grid_containers = () => Selector(container_selector, { timeout: 5000 });

  const foreach_grid_container = async (
    t: TestController,
    callback: (container: Selector, i: number) => Promise<void>
  ) => {
    const containers = get_grid_containers();
    await t.expect(containers.count)[num_cont_comp_fn](num_grids);

    for (let i = 0; i < (await containers.count); i++) {
      await callback(containers.nth(i), i);
    }
  };

  test(`We should have ${num_grids} grids`, async t => {
    if (t.ctx.skip_grid) {
      console.log("Skipping grid tests");
      return;
    }

    await t.expect(get_grid_containers().count)[num_cont_comp_fn](num_grids);
  });

  test(`The grids should contain at least ${min_cards} cards`, async t => {
    if (t.ctx.skip_grid) {
      console.log("Skipping grid tests");
      return;
    }

    await foreach_grid_container(t, async (container, i) => {
      const num_cards = await container.find(card_selector).count;
      await t.expect(num_cards).gte(min_cards);

      const parent = container.parent();
      const scroll_target = (await parent.visible) ? parent : container;

      await t.scrollIntoView(scroll_target).wait(1000);
      await t.takeScreenshot(`${t.fixtureCtx.screenshot_base_path}_${t.browser.name}_grid_${i}.png`);
    });
  });

  if (with_view_more) {
    test(`More products are shown after clicking view more`, async t => {
      if (t.ctx.skip_grid) {
        console.log("Skipping grid tests");
        return;
      }

      await foreach_grid_container(t, async container => {
        const cards = container.find(card_selector);
        const view_more = container.find(view_more_selector);

        let visible_before = 0;
        for (let r = 0; r < 100; ++r) {
          visible_before = await cards.filterVisible().count;
          if (visible_before > 0) {
            break;
          }
          await t.wait(50);
        }

        if ((await cards.count) == visible_before) {
          console.log("All cards are already visible in grid, not checking for View More button");
          return;
        }

        if (view_more_debug) {
          const view_more_container_display = await view_more.parent().nth(0).getStyleProperty("display");
          console.log("View more container display before attempting to click:", view_more_container_display);
        }

        let visible_after = visible_before;
        for (let r = 0; r < 5; ++r) {
          if (await view_more.visible) {
            if (view_more_debug) {
              console.log("View more button visible, clicking...");
            }
            await t.click(view_more);
          } else if (view_more_debug) {
            console.log("View more button not visible.");
          }

          visible_after = await cards.filterVisible().count;
          if (visible_after != visible_before) {
            if (view_more_debug) {
              console.log("Visible cards changed, breaking...");
            }
            break;
          }
          await t.wait(100);
        }

        if (view_more_debug) {
          const view_more_container_display = await view_more.parent().nth(0).getStyleProperty("display");
          console.log("View more container display after attempting to click:", view_more_container_display);
        }

        await t.expect(visible_after).gt(visible_before);
      });
    });
  }
}
