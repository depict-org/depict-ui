import { Selector, test } from "testcafe";

export function test_slider({
  num_sliders,
  container_selector = ".depict.depict-slider",
  card_selector = ".rec_outer",
  navigaton_left_selector = ".d-navbutton.left",
  navigaton_right_selector = ".d-navbutton.right",
  min_cards = 2,
  max_cards = 0,
  offset_y = undefined,
  click_offset_x = undefined,
  slider_padding = 0,
  num_sliders_min = true, // If slider count can vary
}: {
  num_sliders: number;
  num_sliders_min?: boolean;
  container_selector?: string;
  card_selector?: string;
  navigaton_left_selector?: string;
  navigaton_right_selector?: string;
  min_cards?: number;
  max_cards?: number;
  offset_y?: number;
  click_offset_x?: number;
  slider_padding?: number;
}) {
  const get_slider_containers = () => Selector(container_selector, { timeout: 5000 });

  const foreach_slider_container = async (
    t: TestController,
    callback: (container: Selector, i: number) => Promise<void>
  ) => {
    const containers = get_slider_containers();
    await (num_sliders_min ? t.expect(containers.count).gte(num_sliders) : t.expect(containers.count).eql(num_sliders));

    for (let i = 0; i < (await containers.count); i++) {
      await t.expect(containers.nth(i).visible).ok();
      await callback(containers.nth(i), i);
    }
  };

  const foreach_slideable = async (
    t: TestController,
    callback: (
      slider: Selector,
      left_button: Selector,
      right_button: Selector,
      scroll_width: number,
      scroll_right: () => Promise<number>
    ) => Promise<void>
  ) => {
    // If we ever have problems with scoll tests failing on touch devices,
    // try adding a is_hover_available() check from "../utils/is_hover_available"

    await foreach_slider_container(t, async container => {
      const slider = await container.find(".sliding");
      const scroll_width = await slider.scrollWidth;
      const slider_width = await slider.offsetWidth;
      const scroll_right = async () => Math.ceil((await slider.scrollLeft) + slider_width);

      if ((await scroll_right()) >= scroll_width) {
        console.log("Slider doesn't have enough cards to be scrollable");
        return;
      }

      const left_button = await container.find(navigaton_left_selector);
      const right_button = await container.find(navigaton_right_selector);

      if (!((await left_button()) && (await right_button.visible))) {
        console.log("Slider has no visible buttons, might be touch device");
        return;
      }

      // Workaround for other elements overlapping the scroll buttons,
      // which makes testcafe accidentally click those instead. Happened on Nudient PDP, NordicSpectra After Basket.
      await t.scrollIntoView(slider);
      if (offset_y) {
        await t.wait(500);
        await t.scrollBy(0, offset_y);
      }

      await callback(slider, left_button, right_button, scroll_width, scroll_right);
    });
  };

  test(`We should have ${num_sliders} sliders`, async t => {
    if (t.ctx.skip_slider) {
      console.log("Skipping slider tests");
      return;
    }

    const containers = get_slider_containers();
    await (num_sliders_min ? t.expect(containers.count).gte(num_sliders) : t.expect(containers.count).eql(num_sliders));
  });

  test(`The sliders should contain at least ${min_cards} cards`, async t => {
    if (t.ctx.skip_slider) {
      console.log("Skipping slider tests");
      return;
    }

    await foreach_slider_container(t, async (container, i) => {
      const num_cards = await container.find(card_selector).count;
      await t.expect(num_cards).gte(min_cards);

      const parent = container.parent();
      const scroll_target = (await parent.visible) ? parent : container;

      await t.scrollIntoView(scroll_target).wait(1000);
      await t.takeScreenshot(`${t.fixtureCtx.screenshot_base_path}_${t.browser.name}_slider_${i}.png`);
    });
  });

  if (max_cards > 0) {
    test(`The sliders should contain at most ${max_cards} cards`, async t => {
      if (t.ctx.skip_slider) {
        console.log("Skipping slider tests");
        return;
      }

      await foreach_slider_container(t, async container => {
        const num_cards = await container.find(card_selector).count;
        await t.expect(num_cards).lte(max_cards);
      });
    });
  }

  test("The sliders can be scrolled", async t => {
    if (t.ctx.skip_slider) {
      console.log("Skipping slider tests");
      return;
    }

    await foreach_slideable(t, async (slider, left_button, right_button) => {
      await t.expect(slider.scrollLeft).eql(slider_padding);

      // Attempted workaround for slider button clicks failing due to layout shift
      for (let i = 0; i < 5; ++i) {
        await t.click(right_button).wait(100);
        if ((await slider.scrollLeft) != slider_padding) {
          break;
        }
        if (!(await right_button.visible)) {
          break;
        }
      }

      await t.expect(slider.scrollLeft).gt(slider_padding);

      await t.click(left_button, { offsetX: click_offset_x }).wait(500);
      await t.expect(slider.scrollLeft).eql(slider_padding);
    });
  });

  test("The slider buttons hide at the edges", async t => {
    if (t.ctx.skip_slider) {
      console.log("Skipping slider tests");
      return;
    }

    await foreach_slideable(t, async (_, left_button, right_button, scroll_width, scroll_right) => {
      await t.expect(left_button.hasClass("hidden")).ok();
      await t.expect(right_button.hasClass("hidden")).notOk();

      for (let r = 0; r < 50; ++r) {
        // If the right_button suddenly becomes invisible, that's fine. We reached the end.
        await t
          .click(right_button)
          .wait(200)
          .catch(() => t); // Testcafe is weird and demands something from the catch

        if ((await scroll_right()) >= scroll_width || (await right_button.hasClass("hidden"))) {
          break;
        }
      }

      await t.expect(left_button.hasClass("hidden")).notOk();
      await t.expect(right_button.hasClass("hidden")).ok();
    });
  });
}
