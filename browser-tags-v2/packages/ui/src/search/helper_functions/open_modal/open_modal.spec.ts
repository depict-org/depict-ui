import { open_modal_with_alignment } from "./open_modal";
import type { OpenModalArguments } from "@depict-ai/ui";
import { DepictSearch } from "../../../sdks/search";
import { ModalAlignmentSignals } from "../align_field";
import * as connect_search_field_height_to_aligner_height from "../../../shared/helper_functions/connect_search_field_height_to_aligner_height";
import { Accessor } from "solid-js";

jest.mock("../align_field", () => {
  return {
    align_field:
      (
        { body_: [, setModalBodyStyle], field_: [, setModalFiedlStyle] }: ModalAlignmentSignals,
        input_field: HTMLElement,
        alignment: number,
        includeScroll?: boolean,
        pollAlignment: Accessor<boolean> = () => false
      ) =>
      () => {},
  };
});

jest.mock(
  "../../../shared/helper_functions/connect_search_field_height_to_aligner_height",
  (): typeof connect_search_field_height_to_aligner_height => {
    return {
      connect_search_field_height_to_aligner_height: jest.fn().mockReturnValue(() => {
        return {
          cleanup: jest.fn(),
        };
      }),
    };
  }
);

jest.mock("@depict-ai/utilishared", () => {
  return {
    catchify: jest.fn(),
  };
});

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

const createFakeSearch = (): DepictSearch<any, any> => {
  const search = {
    modal_open: null,
  } as unknown as DepictSearch<any, any>;

  return search;
};

const createFakeElement = (element: Partial<HTMLElement>): HTMLElement => {
  const tmpElement = { ...element } as unknown as HTMLElement;

  return tmpElement;
};

const modalWasOpenedCentered = (search: DepictSearch<any>) => {
  return !!search?.modal_open;
};

const modalWasOpenedAligned = (search: DepictSearch<any>) => {
  const openArgs = search?.modal_open as OpenModalArguments;

  return openArgs.length === 2;
};

describe("Open Modal", () => {
  it("should throw an error when location aligned but no aligner ref provided", () => {
    const search = createFakeSearch();

    expect(() => {
      open_modal_with_alignment({
        search,
        location: "aligned",
        element: undefined as unknown as HTMLElement,
      });
    }).toThrowError();
  });

  it("should open centered modal when ref has invalid height", () => {
    const search = createFakeSearch();

    const elem = createFakeElement({ clientHeight: NaN });
    open_modal_with_alignment({
      search,
      location: "aligned",
      element: elem,
    });

    expect(modalWasOpenedCentered(search)).toBe(true);
  });

  it("should open centered modal", () => {
    const search = createFakeSearch();

    open_modal_with_alignment({
      search,
      location: "centered",
    });

    expect(modalWasOpenedCentered(search)).toBe(true);
  });

  it("should default to being centered", () => {
    const search = createFakeSearch();

    open_modal_with_alignment({
      search,
    });

    expect(modalWasOpenedCentered(search)).toBe(true);
  });

  it("should open aligned modal", () => {
    const search = createFakeSearch();
    const element = createFakeElement({ clientHeight: 200 });
    open_modal_with_alignment({
      search,
      location: "aligned",
      element,
    });

    expect(modalWasOpenedAligned(search)).toBe(true);
  });
});
