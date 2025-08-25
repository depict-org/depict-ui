import { Selector } from "testcafe";
import { getStoreConfig, isMobileView } from "../helper";

const { store, store_path } = getStoreConfig();
fixture(store_path).page(`http://127.0.0.1:3000${store.url_path}`);

export const modalOpensAlignedTest = async (tc: TestController, aligner_selector: string) => {
  const modal_body_selector = ".depict-search-modal > .body";
  const modal_top_prop = await Selector(modal_body_selector).getStyleProperty("top");
  const modal_bounding_rect = await Selector(modal_body_selector).boundingClientRect;
  const aligner_bounding_rect = await Selector(aligner_selector).boundingClientRect;

  if (await isMobileView(tc)) {
    // Check that modal is at the top
    await tc.expect(modal_top_prop).eql("0px");
  } else {
    // Check that modal is aligned
    const modal_top_prop_has_pixels = modal_top_prop.endsWith("px");

    await tc.expect(modal_top_prop_has_pixels).eql(true, "Modal top property should be in pixels, not a percentage.");
    await tc.expect(modal_bounding_rect.top).typeOf("number", "Modal Y position should be a number");

    await tc
      .expect(modal_bounding_rect.top)
      .eql(aligner_bounding_rect.top, "Modal Y position should match aligner Y position");

    if (store.modal_horizontal_align) {
      const left_diff = Math.abs(modal_bounding_rect.left - aligner_bounding_rect.left);
      const right_diff = Math.abs(modal_bounding_rect.right - aligner_bounding_rect.right);

      await tc.expect(left_diff + right_diff).lte(1, "Modal should be horizontally aligned with aligner");
    }
  }
};
