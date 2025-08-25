import { is_hover_available } from "../utils/is_hover_available";
import { storefronts } from "./config";
import { TestFilePaths } from "./test-configs";

export const initSPACheck = async (tc: TestController) => {
  // Some storefronts should be SPA navigating at all times during the tests, with no full page loads.
  // Others definitely SHOULD be doing full page loads, otherwise something is wrong.
  // We set a property on window and check later to confirm it's still there, or NOT there if it shouldn't be.
  const one_page_variable_name = "depicttest_" + Math.random().toString().substring(2);
  await tc.eval(
    () => {
      window[one_page_variable_name] = true;
    },
    { dependencies: { one_page_variable_name } }
  );
  return one_page_variable_name;
};

export const confirmSPACheck = async (
  tc: TestController,
  one_page_variable_name: string,
  is_one_page: boolean,
  error_message: string
) => {
  const returned_value: boolean = await tc.eval(() => !!window[one_page_variable_name], {
    dependencies: { one_page_variable_name },
  });
  await tc.expect(returned_value).eql(is_one_page, error_message);
};

export const getStoreConfig = () => {
  const store_path = process.env.store_path || ";";
  const store = storefronts[store_path];
  if (!store) {
    console.log(`No store configured for ${store_path}`);
  }

  return { store, store_path };
};

export const isMobileView = async (tc: TestController) => {
  const height = await tc.eval(() => window.innerHeight);

  const hover = await is_hover_available();
  return hover ? height <= 790 : height <= 1000; // packages/plp-styling/components/search/SearchModal.scss @media query on .body
};

export const getTestConfig = <T extends TestFilePaths>(storeFront: string, test: T) => {
  const store = storefronts[storeFront];
  if (!store) {
    console.log(`No store configured for ${storeFront}`);
  }

  return store["testConfigs"][test];
};

export const quickLinkHash = async (quicklinks: Selector) => {
  let pseudo_hash = "";
  const quicklink_count = await quicklinks.count;
  for (let i = 0; i < quicklink_count; i++) {
    const quicklink = quicklinks.nth(i);
    const quicklink_text = await quicklink.innerText;
    const quicklink_selected = await quicklink.hasClass("selected");
    pseudo_hash += `${quicklink_text}${quicklink_selected ? "selected" : ""}|`;
  }
  return pseudo_hash;
};

export const breadcrumbHash = async (breadcrumbs: Selector) => {
  let pseudo_hash = "";
  const breadcrumb_count = await breadcrumbs.count;
  for (let i = 0; i < breadcrumb_count; i++) {
    const breadcrumb = breadcrumbs.nth(i);
    const breadcrumb_text = await breadcrumb.innerText;
    pseudo_hash += `${breadcrumb_text}>`;
  }
  return pseudo_hash;
};

export async function ensurePageHasLoaded(tc: TestController) {
  const browser_message = await tc.eval(
    () =>
      new Promise<void | string>(resolve => {
        const page_hasnt_loaded = // @ts-ignore
          globalThis?.performance?.getEntriesByType?.("navigation")?.every?.(e => e?.loadEventEnd) === false;
        if (page_hasnt_loaded) {
          window.addEventListener("load", () => resolve("Waited for page to load"), { once: true });
        }
        resolve();
      })
  );
  if (browser_message) console.log(browser_message);
}
