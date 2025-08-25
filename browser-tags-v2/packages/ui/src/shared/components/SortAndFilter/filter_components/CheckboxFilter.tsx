/** @jsxImportSource solid-js */
import {
  Accessor,
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  Index,
  JSX as solid_JSX,
  onCleanup,
  Show,
  Signal,
} from "solid-js";
import { SearchFilter, ValuesFilterMeta } from "@depict-ai/types/api/SearchResponse";
import { catchify } from "@depict-ai/utilishared";
import { Checkbox } from "./Checkbox";
import { solid_plp_shared_i18n } from "../../../../locales/i18n_types";
import { useExpandingContainerReactive } from "../../../helper_functions/expanding_container_with_reactive_kids";
import { ExpandCollapseFilter } from "../ExpandCollapseFilter";
import { to_lower_case_if_possible } from "../../../helper_functions/to_lower_case_if_possible";
import { HighlightTextInSpan } from "../../../../search/components/HighlightTextInSpan";

const max_visible_without_collapsing = 15;
const show_non_collapsible_when_collapsed = 4;

/**
 * Renders a filter that is a list of checkboxes
 */
export function CheckboxFilter({
  filter_,
  selected_filters_: [get_selected_filters, set_selected_filters],
  i18n_,
  view_more_button_below_group_: [, set_view_more_button_below_group_],
  filter_query_,
}: {
  filter_: Accessor<SearchFilter>;
  selected_filters_: Signal<SearchFilter[]>;
  i18n_: solid_plp_shared_i18n;
  view_more_button_below_group_: Signal<solid_JSX.Element>;
  filter_query_?: Accessor<string | undefined>;
}) {
  const existing_filter = createMemo(() => {
    const { field, op } = filter_();

    return get_selected_filters().find(
      ({ field: checking_field, op: checking_op }) => checking_field === field && checking_op === op
    );
  });
  let form: HTMLFormElement;
  const checkboxes = createMemo(() => {
    const meta = filter_().meta as ValuesFilterMeta;
    return meta.values.map(
      (value_, index) => ({ value_, name_: meta.names?.[index], count_: meta.counts?.[index] }) as const
    );
  });

  const render_checkbox = (
    checkbox: Accessor<{
      value_: string | number | [number, number] | [number, string] | [string, number] | [string, string];
      name_: string | undefined;
      count_: number | undefined;
    }>
  ) => {
    // Checkbox always calls the getters in props, so we don't wrap these values into memos
    const is_checked = createMemo(() => {
      const data = existing_filter()?.data as undefined | (string | number | number[])[];
      const value = to_lower_case_if_possible(checkbox().value_);
      return !!data?.some(item => to_lower_case_if_possible(item) === value);
    });
    const value = createMemo(() => checkbox().value_ as string);
    const is_count_zero = createMemo(() => checkbox().count_ === 0);
    const display_text = createMemo(() => checkbox().name_ || value());

    return (
      <Checkbox
        value_={value()}
        label_={
          <Show
            when={is_count_zero()}
            fallback={
              // Don't show highlighted text when disabled because a) it's confusing and b) the highlighting color messed up the disableing color
              <HighlightTextInSpan
                whole_text_to_display_={display_text}
                searching_for_value_={() => filter_query_?.()}
              />
            }
          >
            {display_text()}
          </Show>
        }
        count_={checkbox().count_}
        checked_={is_checked()}
      />
    );
  };

  const show_extras_signal = createSignal(false);
  const [get_show_extras] = show_extras_signal;
  const togglable_rest = createMemo(() => checkboxes().length > max_visible_without_collapsing);
  const { expand, collapse, ExpandingContainer } = useExpandingContainerReactive({ duration: 200 });
  const expanding_container_els = (
    <ExpandingContainer>
      <Show when={togglable_rest()}>
        <Index each={checkboxes().slice(show_non_collapsible_when_collapsed)}>{render_checkbox}</Index>
      </Show>
    </ExpandingContainer>
  );

  createRenderEffect(() => {
    set_view_more_button_below_group_(
      togglable_rest() ? <ExpandCollapseFilter show_extras_={show_extras_signal} i18n_={i18n_} /> : []
    );
  });

  onCleanup(() => set_view_more_button_below_group_());

  createEffect(
    catchify(async () => {
      if (!togglable_rest()) {
        await collapse();
        return;
      }
      if (get_show_extras()) {
        await expand();
      } else {
        await collapse();
      }
    })
  );

  return (
    <form
      class="checkboxes"
      ref={form!}
      onChange={catchify(() => {
        const set_filter = existing_filter();
        const { field, op } = filter_();
        const base_object = set_filter ? set_filter : { op, field };
        const filter_object = {
          ...base_object,
          data: [...new FormData(form)].filter(([, value]) => value === "on").map(([key]) => key),
        };
        const selected_filters = [...get_selected_filters()];
        if (set_filter) {
          selected_filters.splice(selected_filters.indexOf(set_filter), 1);
        }
        if (filter_object.data.length) {
          selected_filters.push(filter_object);
        }
        set_selected_filters(selected_filters);
      })}
    >
      <Index each={togglable_rest() ? checkboxes().slice(0, show_non_collapsible_when_collapsed) : checkboxes()}>
        {render_checkbox}
      </Index>
      {expanding_container_els}
    </form>
  );
}
