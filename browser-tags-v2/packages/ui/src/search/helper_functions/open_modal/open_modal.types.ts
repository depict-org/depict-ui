import { Display, ModernDisplay } from "@depict-ai/utilishared";
import { DepictSearch } from "../../../sdks/search";

type CenteredLocation = {
  location?: "centered";
};

type AlignedLocation = {
  location: "aligned";
  element: HTMLElement;
  /**
   * If true, the height of the search field in the modal won't be set to the height of the element we're aligning to
   */
  ignoreFieldSize_?: boolean;
};

/**
 * How the modal should be opened.
 */
export type ModalLocation = AlignedLocation | CenteredLocation;

export type OpenModalParams<
  OriginalDisplay extends Display,
  OutputDisplay extends ModernDisplay | never,
> = ModalLocation & {
  search: DepictSearch<OriginalDisplay, OutputDisplay>;
  /**
   * If true, the search field in the modal opened will be empty and de-coupled from the other SearchFields.
   */
  makesNewSearch?: boolean;
  /**
   * Whether to run the animations that the V2 search modal runs by default
   */
  runAnimations_?: boolean;
};
