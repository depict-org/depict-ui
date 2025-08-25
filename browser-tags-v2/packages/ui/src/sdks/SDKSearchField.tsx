import { run_in_root_or_auto_cleanup } from "../shared/helper_functions/run_in_root_or_auto_cleanup";
import { SearchField } from "../search/components/SearchField";
import { Accessor, createComputed, createRoot, createSignal, JSX as solid_JSX, onCleanup, Setter } from "solid-js";
import {
  align_field,
  ALIGN_LEFT,
  ALIGN_TOP,
  ALIGN_WIDTH_ON_FIELD_IN_MODAL,
  ALIGN_WIDTH_ON_MODAL,
  ModalAlignmentSignals,
  SET_CENTERED_LEFT,
} from "../search/helper_functions/align_field";
import { catchify } from "@depict-ai/utilishared";
import { replaceWithFakeFieldAndAnimate } from "../search/helper_functions/replaceWithFakeFieldAndAnimate";
import { connect_search_field_height_to_aligner_height } from "../shared/helper_functions/connect_search_field_height_to_aligner_height";
import { DepictSearch, get_shared_search_properties } from "./search";

interface SearchFieldParams {
  depict_search: DepictSearch<any>;
  modal_dispose_handler?: VoidFunction;
  // Stuff needed for non-standard customer deployments that we shouldn't actually expose
  click_handler?: (this: HTMLDivElement, ev: MouseEvent) => any;
  aligner_ref?: HTMLElement | null; // <- reactive
  class?: string;
}

/**
 * Returns a SearchField that will open a modal aligned to it when clicked.
 */
export function SDKSearchField(props: SearchFieldParams) {
  const { depict_search, modal_dispose_handler, click_handler } = props;
  const shared_properties = get_shared_search_properties(depict_search);
  return run_in_root_or_auto_cleanup(() => {
    let input_element: HTMLInputElement;
    let buttonInField: HTMLButtonElement;
    const search_field = (
      <SearchField
        class_={() => props.class}
        BackIcon_={shared_properties.BackIcon_}
        search_field_value_={shared_properties.state_.field_value}
        submit_query_={shared_properties.configured_submit_query_}
        clear_filters_={shared_properties.clear_filters_on_next_submit_}
        i18n_={shared_properties.i18n_}
        disabled_={true}
        input_field_ref_={el => (input_element = el)}
        buttonInFieldRef_={el => (buttonInField = el)}
        field_element_ref_={field => {
          const bodyAlignmentSignal_ = createSignal<solid_JSX.CSSProperties>({ position: "fixed" });
          const backdropAlignmentSignal_ = createSignal<solid_JSX.CSSProperties>({});
          const alignmentSignals_: ModalAlignmentSignals = {
            body_: bodyAlignmentSignal_,
            field_: createSignal<solid_JSX.CSSProperties>({}),
            backdrop_: backdropAlignmentSignal_,
          };

          const defaultHandler = catchify((e: MouseEvent) => {
            const { modalVersionUsed_ } = shared_properties;
            let pollAlignment: Accessor<boolean> | undefined;
            let setModalSearchFieldOuterWidth_: Setter<number> | undefined;
            let revert: (() => Promise<void>) | undefined;
            if (modalVersionUsed_ === 2) {
              let setPollAlignment_: Setter<boolean>;
              let modalSearchFieldOuterWidth_: Accessor<number>;
              [pollAlignment, setPollAlignment_] = createSignal(false);
              [modalSearchFieldOuterWidth_, setModalSearchFieldOuterWidth_] = createSignal(0);
              revert = replaceWithFakeFieldAndAnimate({
                actualField_: search_field as HTMLDivElement,
                makeFakeField_: () =>
                  (
                    <SearchField
                      BackIcon_={shared_properties.BackIcon_}
                      search_field_value_={shared_properties.state_.field_value}
                      submit_query_={shared_properties.configured_submit_query_}
                      clear_filters_={shared_properties.clear_filters_on_next_submit_}
                      i18n_={shared_properties.i18n_}
                      disabled_={true}
                    />
                  ) as HTMLDivElement,
                wrap_: true,
                bodyAlignmentSignal_,
                backdropStyleSignal_: backdropAlignmentSignal_,
                setPollAlignment_,
                buttonInField_: buttonInField,
                modalSearchFieldOuterWidth_,
              });
            }

            // When selecting text in the SearchField that's in the page we want the same selection to persist. It doesn't by itself, since the SearchModalV2 has an entirely different SearchField. Therefore, we manually copy the selection over.
            const selected_text_range_ = [input_element.selectionStart, input_element.selectionEnd] as const;

            const { cleanup } = align_field_modal(
              alignmentSignals_,
              search_field,
              modalVersionUsed_,
              () => props.aligner_ref,
              pollAlignment
            );

            const complete_modal_dispose_handler = () => {
              modal_dispose_handler?.();
              cleanup();
            };

            depict_search.modal_open = [
              {
                alignmentSignals_,
                selected_text_range_,
                closing_animation_: revert,
                setSearchFieldOuterWidth_: setModalSearchFieldOuterWidth_,
              },
              complete_modal_dispose_handler,
            ];
          });

          const handler = click_handler ?? defaultHandler;
          field.addEventListener("click", handler);
          onCleanup(() => field.removeEventListener("click", handler));
        }}
      />
    ) as ReturnType<typeof SearchField>;

    // We assume this to be an array containing exactly on div in js-ui
    return [
      // this doesn't have an id since it's really easy for the SDK user to just wrap it in an element that has one
      (<div class="depict plp search">{search_field}</div>) as HTMLDivElement,
    ];
  }, "SearchField failed");
}

interface AlignFieldCustomReturn {
  cleanup: () => void;
}

function align_field_modal(
  alignmentSignals: ModalAlignmentSignals,
  input: HTMLDivElement,
  modalVersion: 1 | 2,
  aligner_ref_accessor: Accessor<HTMLElement | null | undefined>,
  pollAlignment?: Accessor<boolean>
): AlignFieldCustomReturn {
  return createRoot(dispose => {
    createComputed(() => {
      const aligner_ref = aligner_ref_accessor?.();
      if (!aligner_ref) {
        align_field(
          alignmentSignals,
          input,
          ALIGN_LEFT |
            ALIGN_TOP |
            (modalVersion === 1 ? ALIGN_WIDTH_ON_MODAL : SET_CENTERED_LEFT | ALIGN_WIDTH_ON_FIELD_IN_MODAL),
          undefined,
          pollAlignment
        );
        return;
      }
      const { cleanup } = connect_search_field_height_to_aligner_height(aligner_ref);
      onCleanup(cleanup);
      align_field(alignmentSignals, aligner_ref, ALIGN_TOP, undefined, pollAlignment);
    });

    return { cleanup: dispose };
  });
}
