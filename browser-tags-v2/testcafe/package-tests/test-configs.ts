export enum TestFilePaths {
  PLP_UI = "plp-ui.ts",
  MODAL_OPENS_CENTERED = "modal/modal-opens-centered.ts",
  MODAL_OPENS_ALIGNED = "modal/modal-opens-aligned.ts",
}

export type TestConfigs = {
  [TestFilePaths.PLP_UI]: undefined;
  [TestFilePaths.MODAL_OPENS_CENTERED]: undefined;
  [TestFilePaths.MODAL_OPENS_ALIGNED]: {
    aligner_selector: string;
  };
};
