import {
  Accessor,
  createComputed,
  createEffect,
  createMemo,
  getOwner,
  onCleanup,
  runWithOwner,
  Signal,
  untrack,
} from "solid-js";
import { catchify } from "@depict-ai/utilishared";
import {
  CurrentlyShowingKeyboardSelectableItems,
  SelectedIndexType,
  TextSuggestionType,
} from "./keyboard_navigation_types";
import { PseudoRouter } from "../../shared/helper_functions/pseudo_router";
import { open_link_new_tab_on_cmd_pressed } from "./open_link_new_tab_on_cmd_pressed";

export function autocomplete_keyboard_navigation({
  selected_index_: [read_selected_index, write_selected_index],
  currently_showing_suggestions_: [read_currently_showing_suggestions],
  ...rest_of_props
}: {
  element_: Accessor<HTMLInputElement | undefined>;
  updating_blocked_: Signal<boolean>;
  search_field_value_: Signal<string>;
  selected_index_: SelectedIndexType;
  set_override_on_enter_fn_: (new_fn: (e: KeyboardEvent) => boolean) => unknown;
  currently_showing_suggestions_: CurrentlyShowingKeyboardSelectableItems;
  url_transformer_?: (url_object: URL) => unknown;
  search_query_param_name_: string;
  router_: PseudoRouter;
}) {
  const last_suggestion_index_ = createMemo(() => {
    const currently_showing_suggestions = read_currently_showing_suggestions();
    let total_length = 0;
    for (let i = 0; i < currently_showing_suggestions.length; i++) {
      const memo = currently_showing_suggestions[i];
      if (memo) {
        total_length += memo().length;
      }
    }
    return total_length - 1;
  });
  const read_selected_fake_index_ = createMemo(() => {
    const selected = read_selected_index();
    if (!selected) {
      return selected;
    }
    const currently_showing_suggestions = read_currently_showing_suggestions();
    let index = 0;
    for (let i = 0; i < currently_showing_suggestions.length; i++) {
      const contents = currently_showing_suggestions[i]?.();
      if (!contents) {
        continue;
      }
      for (let j = 0; j < contents.length; j++) {
        if (i === selected[0] && j === selected[1]) {
          return index;
        }
        index++;
      }
    }
  });
  const write_selected_fake_index_ = (index_to_select: number | undefined) => {
    if (index_to_select == undefined || index_to_select < 0) {
      write_selected_index(undefined);
      return;
    }
    const currently_showing_suggestions = untrack(read_currently_showing_suggestions);
    let index = 0;
    for (let i = 0; i < currently_showing_suggestions.length; i++) {
      const contents = currently_showing_suggestions[i]?.();
      if (!contents) {
        continue;
      }
      for (let j = 0; j < contents.length; j++) {
        if (index === index_to_select) {
          write_selected_index([i, j, true]);
          return contents[j];
        }
        index++;
      }
    }
  };
  // TODO: if selected item stops existing, remove it
  // Is above actually not done???
  actual_navigation_working_on_fake_data({
    ...rest_of_props,
    last_suggestion_index_,
    read_selected_fake_index_,
    write_selected_fake_index_,
  });
}

function actual_navigation_working_on_fake_data({
  element_,
  search_field_value_: [get_search_field_value, set_search_field_value],
  updating_blocked_: [read_updating_blocked, write_updating_blocked],
  last_suggestion_index_,
  read_selected_fake_index_,
  write_selected_fake_index_,
  set_override_on_enter_fn_,
  url_transformer_,
  search_query_param_name_,
  router_,
}: {
  element_: Accessor<HTMLInputElement | undefined>;
  updating_blocked_: Signal<boolean>;
  search_field_value_: Signal<string>;
  last_suggestion_index_: Accessor<number>;
  write_selected_fake_index_: (index_to_select: number | undefined) => TextSuggestionType | undefined;
  set_override_on_enter_fn_: (new_fn: (e: KeyboardEvent) => boolean) => unknown;
  read_selected_fake_index_: Accessor<number | undefined>;
  url_transformer_?: (url_object: URL) => unknown;
  search_query_param_name_: string;
  router_: PseudoRouter;
}) {
  let previous_value: string;
  createEffect(() => {
    const sfv = get_search_field_value();
    if (!untrack(() => read_updating_blocked())) {
      previous_value = sfv;
    }
  });
  const owner = getOwner()!;
  const handler = catchify(({ keyCode }: KeyboardEvent) =>
    untrack(() => {
      const up = keyCode === 38;
      const down = keyCode === 40;
      if (!up && !down) {
        return;
      }
      const current = read_selected_fake_index_();
      const to_select =
        !isNaN(current!) && current! >= 0 && current! <= last_suggestion_index_()
          ? current! + (down ? 1 : -1)
          : up
          ? last_suggestion_index_()
          : 0;

      const selected_entry = write_selected_fake_index_(to_select > last_suggestion_index_() ? undefined : to_select);

      const block_updating_for_one_change = () => {
        write_updating_blocked(true);

        let calls = 0;
        createEffect(() => {
          if (calls < 1) {
            get_search_field_value();
          } else {
            write_updating_blocked(false);
          }
          calls++;
        });
      };

      const override_on_enter_for_this_entry = (new_fn: (e: KeyboardEvent) => boolean) => {
        set_override_on_enter_fn_(new_fn);

        // Only override while this item has been selected with the keyboard
        createComputed((run: number) => {
          if (!run) {
            read_selected_fake_index_();
          } else {
            set_override_on_enter_fn_(() => false);
          }
          return run + 1;
        }, 0);
      };

      if (!selected_entry) {
        runWithOwner(owner, block_updating_for_one_change);
        set_search_field_value(previous_value);
        return;
      }
      // update text field value if needed
      if ("page_url_" in selected_entry) {
        runWithOwner(owner, () =>
          override_on_enter_for_this_entry(e => {
            const { page_url_ } = selected_entry;
            if (!open_link_new_tab_on_cmd_pressed(e, page_url_!)) {
              // Above fn will return true if it opened a new tab, and we won't make these checks anymore
              router_.navigate_.go_to_({ new_url_: page_url_!, is_replace_: false });
            }
            return true;
          })
        );
        return;
      }
      const { title_ } = selected_entry;
      runWithOwner(owner, block_updating_for_one_change);
      set_search_field_value(title_);
      runWithOwner(owner, () =>
        override_on_enter_for_this_entry(e => {
          // Open search query in new tab on cmd+enter
          // If it's not cmd+enter, pressing enter will just submit the value that was put into the field while selecting with the arrow keys ;)
          const url = new URL(location as any as string);
          url_transformer_?.(url);
          url.searchParams.set(search_query_param_name_, title_);
          return open_link_new_tab_on_cmd_pressed(e, url.href);
        })
      );
    })
  );

  createEffect(() => {
    const el = element_();
    if (!el) {
      return;
    }
    el.addEventListener("keyup", handler);
    onCleanup(catchify(() => el.removeEventListener("keyup", handler)));
  });
}
