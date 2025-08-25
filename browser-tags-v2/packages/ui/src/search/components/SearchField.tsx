/* @refresh reload */
import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  getOwner,
  JSX,
  onCleanup,
  runWithOwner,
  Show,
  Signal,
} from "solid-js";
import { catchify, observer } from "@depict-ai/utilishared";
import { solid_search_i18n } from "../../locales/i18n_types";
import { CrossIcon } from "../../shared/components/icons/CrossIcon";
import { SearchIcon } from "../../shared/components/icons/SearchIcon";
import { modalVersionSymbol } from "../helper_functions/modalVersionSymbol";
import { make_accurate_width_accessor } from "../../shared/helper_functions/make_accurate_width_accessor";
import { MagnifyingGlassIcon } from "../../shared/components/icons/MagnifyingGlassIcon";

export function SearchField({
  search_field_value_: [searchFieldValue, setSearchFieldValue],
  input_field_ref_,
  field_element_ref_,
  submit_query_,
  override_on_enter_,
  clear_filters_,
  disabled_ = false,
  on_back_,
  i18n_,
  after_focusing_,
  BackIcon_,
  buttonInFieldRef_,
  class_,
  setSearchRoleOnContainer_ = true,
  ariaControls,
}: {
  search_field_value_: Signal<string>;
  input_field_ref_?: (el: HTMLInputElement) => unknown;
  field_element_ref_?: (el: HTMLDivElement) => unknown;
  buttonInFieldRef_?: (el: HTMLButtonElement) => unknown;
  disabled_?: boolean;
  override_on_enter_?: (e: KeyboardEvent) => true | false | undefined;
  submit_query_: VoidFunction;
  clear_filters_: (user_triggered: boolean) => void;
  on_back_?: VoidFunction;
  i18n_: solid_search_i18n;
  after_focusing_?: (input_element: HTMLInputElement) => void;
  BackIcon_: () => JSX.Element;
  class_?: Accessor<string | undefined>;
  // True for everything except when running inside a search modal
  setSearchRoleOnContainer_?: boolean;
  ariaControls?: string;
}) {
  let input_element: HTMLInputElement;
  // This is the div where we recommend (and ourselves do) attach the event listener to that opens the search modal.
  let field_div: HTMLDivElement;
  createEffect(
    catchify(async () => {
      if (disabled_) {
        return;
      }
      // we aren't in DOM yet unfortunately, wouldn't even be with onMount
      await observer.wait_for_element(input_element);
      input_element.focus();
      after_focusing_?.(input_element);
    })
  ); // focus field on render
  const owner_of_field_element = getOwner();
  const isNewModal = BackIcon_[modalVersionSymbol] === 2;
  const [backButtonWidthAccessor, setBackButtonWidthAccessor] = createSignal<Accessor<number | undefined>>();
  const getBackButtonWidth = () => backButtonWidthAccessor()?.();
  const searchFieldEmpty = createMemo(() => !searchFieldValue());
  const BackButton = () => (
    <Show when={on_back_}>
      <button
        class="back"
        onClick={catchify(on_back_!)}
        type="button"
        aria-label={i18n_.back_()}
        {...(isNewModal && {
          ref: el => {
            setBackButtonWidthAccessor(() => make_accurate_width_accessor(el));
            onCleanup(() => setBackButtonWidthAccessor());
          },
        })}
      >
        {isNewModal ? <CrossIcon /> : <BackIcon_ />}
      </button>
    </Show>
  );
  const ClearButton = () => (
    <button
      type="button"
      class="clear"
      classList={{ empty: searchFieldEmpty() }}
      style={isNewModal || !searchFieldEmpty() ? "" : "display: none"}
      ref={buttonInFieldRef_}
      onClick={catchify(() => {
        if (isNewModal && searchFieldEmpty()) return;
        setSearchFieldValue("");
        clear_filters_(true);
        if (!disabled_) {
          input_element.focus();
        }
      })}
      {...(searchFieldEmpty()
        ? { "aria-hidden": "true", tabIndex: -1 }
        : { title: i18n_.clear_filters_query_sorting_after_submit_() })}
    >
      {isNewModal ? (
        <Show when={!searchFieldEmpty()} fallback={<MagnifyingGlassIcon />}>
          <BackIcon_ />
        </Show>
      ) : (
        <CrossIcon />
      )}
    </button>
  );

  return (
    <div
      class={`search-field${on_back_ ? " in-modal" : ""}${class_?.() ? ` ${class_()}` : ""}`}
      {...(setSearchRoleOnContainer_ && { role: "search" })}
    >
      <Show when={getBackButtonWidth() !== undefined && on_back_}>
        <div style={{ width: getBackButtonWidth() + "px" }} class="spacer" />
      </Show>
      {!isNewModal && <BackButton />}
      <div
        class="field"
        /* In new modal (this should be a no-op for old modal) we want the cursor to land at the end of the text when clicking in the padding around the input field
           therefore we have padding on .field instead of .query and then focus query if the padding is clicked (otherwise the curser gets placed at the start when it shouldn't) */
        onClick={catchify(({ target, currentTarget, detail }) => {
          if (target !== currentTarget || disabled_) return;
          if (detail === 3) {
            // triple click, select all
            input_element.select();
          }
          input_element.focus();
          if (detail === 2) {
            // Double click, select last word
            const value = input_element.value;
            // Use a regular expression to find the last word
            // This pattern looks for a word at the end of the string
            const lastWordMatch = value.match(/\b(\w+)$/);
            if (lastWordMatch) {
              // Get the index of the last word
              const start = value.lastIndexOf(lastWordMatch[0]);
              // Set the selection range to the last word
              input_element.setSelectionRange(start, start + lastWordMatch[0].length);
            }
          }
        })}
        ref={el => {
          field_div = el;
          field_element_ref_?.(el);
        }}
      >
        {isNewModal && <ClearButton />}
        <input
          class="query"
          classList={{ "has-adjacent-back-button": !!on_back_ }}
          ref={catchify((el: HTMLInputElement) => {
            input_element = el;
            input_field_ref_?.(el);
          })}
          tabindex="0"
          enterkeyhint="search"
          {...(setSearchRoleOnContainer_
            ? { "aria-label": i18n_.search_field_field_aria_label_() }
            : // Searchbox announces basically the same as our aria-label, we could explore always using searchbox in the future
              { role: "searchbox" })}
          value={searchFieldValue()}
          onKeyDown={catchify((e: KeyboardEvent) => {
            if (disabled_) {
              if (e.key !== "Tab" && e.key !== "Shift") {
                // alow tab-selecting the input field and then open the modal when the user start writing but also to move past the field with tab
                input_element.click();
              }
            } else if (e.key === "Enter") {
              const dont_submit = override_on_enter_?.(e);
              if (!dont_submit) {
                submit_query_();
              }
            }
          })}
          onInput={catchify(() => {
            const { value } = input_element;
            if (!disabled_ && !value.length) {
              clear_filters_(false); // if the user clears the whole field, reset filters on next submit
              // we do this here and not in filter_clearing_helper because we only want to do this on user input and not if the user navigates back and forwards what also would mutate search_field_value
              // this does not count as user triggered since it wasn't explicit
            }
            setSearchFieldValue(value);
          })}
          onSelect={catchify(() => {
            if (disabled_) {
              // just in case. The field not actually being disabled when being disabled_ is so that you can focus it and open the modal. We don't want any of the other input-field-interaction features to work
              return;
            }
            if (input_element.selectionStart === 0 && input_element.selectionEnd === input_element.value.length) {
              // everything was selected, clear filters on next submit on next input
              input_element.addEventListener(
                "input",
                catchify(() => clear_filters_(false)), // We don't count this as user triggered since it wasn't explicit
                { once: true }
              );
            }
          })}
          onPointerDown={({ pointerType }) => {
            // When selecting text with a mouse we want a SearchField to be focussed even when releasing the mouse outside the .field element (we assume the event listener which opens the modal is attached to that).
            if (pointerType === "mouse") {
              const handler = catchify(({ pointerType, target }: PointerEvent) => {
                if (
                  pointerType !== "mouse" ||
                  !(target instanceof Node) ||
                  target === field_div ||
                  field_div.contains(target)
                ) {
                  return;
                }
                input_element.click();
              });
              window.addEventListener("pointerup", handler, { once: true });

              runWithOwner(owner_of_field_element, () =>
                onCleanup(() => window.removeEventListener("pointerup", handler))
              );
            }
          }}
          placeholder={i18n_.placeholder_text_()}
          aria-autocomplete="list"
          aria-haspopup="dialog"
          {...(ariaControls && { "aria-controls": ariaControls })}
        />
        {!isNewModal && <ClearButton />}
      </div>
      {isNewModal && <BackButton />}
      <Show when={!isNewModal}>
        <button
          class="submit major"
          onClick={catchify(() => submit_query_())}
          type="button"
          aria-label={i18n_.search_submit_button_aria_label_()}
        >
          <SearchIcon />
        </button>
      </Show>
    </div>
  ) as HTMLDivElement;
}
