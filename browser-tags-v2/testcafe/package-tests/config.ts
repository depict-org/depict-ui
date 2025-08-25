interface Selectors {
  open_modal: string;
  // Something that's only present on PDP, and not PLP listing pages
  pdp_content: string;
  modal_aligner?: string;
}

export const mobileSizes = {
  width: 390,
  height: 790,
};

export const desktopSizes = {
  width: 1920,
  height: 1080,
};

export interface StoreFrontTestConfig {
  launch_command: string[];
  launch_cwd?: string;
  url_path: string;
  skipNavigationBased?: boolean;
  selectors: Selectors;
  query: string;
  spa: boolean;
  modal_horizontal_align?: boolean;
  test_placeholders?: boolean;
  test_next_modal_navigation?: boolean;
  test_dpc?: boolean; // We can only do this in vanilla-js because react-ui sets up a default dpc instance inclusive global dpq which would pollute our test
  look_for_content_blocks?: boolean; // only on category and collection pages for now
}

const { YRN_PATH } = process.env;
const yarn_path = YRN_PATH || "yarn";
export const storefronts: Record<string, StoreFrontTestConfig> = {
  "next-commerce": {
    launch_command: ["pnpm", "start"],
    launch_cwd: "site/",
    url_path: "/",
    // Fails because navigating to PDP throws an error and does a hard navigation,
    // 'Error: Route did not complete loading: /product/[slug]'. Next.js issue with no known workaround.
    // The error is very rare during normal browsing but for whatever reason always occurs in the Docker container.
    skipNavigationBased: true,
    query: "top",
    selectors: {
      open_modal: "nav[class*='Navbar_navMenu'] button",
      modal_aligner: ".aligner",
      pdp_content: "div[role=listbox]",
    },
    spa: true,
    test_next_modal_navigation: true,
  },
  "next-web": {
    launch_command: [yarn_path, "start"],
    url_path: "/gb",
    // When running on low CPU, which the pipeline workers sometimes are, the next router also randomly hard navigates and throws Error: Route did not complete loading: /[market]/search here, so disable the related tests here as well
    skipNavigationBased: true,
    query: "tights",
    test_placeholders: true,
    test_next_modal_navigation: true,
    look_for_content_blocks: true,
    selectors: {
      open_modal: "header button",
      modal_aligner: ".aligner",
      pdp_content: ".pdp-test",
    },
    spa: true,
  },
  "react-web": {
    launch_command: [yarn_path, "start"],
    url_path: "/",
    query: "ridbyxor",
    selectors: {
      open_modal: "button.search-button",
      pdp_content: ".pdp-test",
    },
    spa: true,
  },
  "vanilla-js": {
    launch_command: [yarn_path, "start"],
    url_path: "/",
    query: "blue",
    look_for_content_blocks: true,
    selectors: {
      open_modal: ".depict.plp input.query",
      modal_aligner: ".search-field-wrapper .depict .search-field",
      pdp_content: ".pdp-test",
    },
    spa: false,
    modal_horizontal_align: false,
    test_dpc: true,
  },
};
