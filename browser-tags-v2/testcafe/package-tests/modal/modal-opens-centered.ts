import { Selector } from "testcafe";
import { isMobileView } from "../helper";

export const modalOpensCenteredTest = async (tc: TestController) => {
  const modal_top_prop = await Selector(`.depict-search-modal > .body`).getStyleProperty("top");

  if (await isMobileView(tc)) {
    // Check that modal is at the top
    await tc.expect(modal_top_prop).eql("0px");
  } else {
    const height = await tc.eval(() => window.innerHeight);

    // Since the top property is set to 50%, the computed value is half the height of the viewport
    const expected_top = height / 2;
    // Check that modal is centered
    await tc.expect(modal_top_prop).eql(`${expected_top}px`);
  }
};
