/** @jsxImportSource solid-js */
import { Accessor, createMemo, Index, JSX as solid_JSX, Show, Signal } from "solid-js";
import { SearchFilter, ValuesFilterMeta } from "@depict-ai/types/api/SearchResponse";
import { catchify, make_random_classname } from "@depict-ai/utilishared";
import { solid_plp_shared_i18n } from "../../../../locales/i18n_types";
import { to_lower_case_if_possible } from "../../../helper_functions/to_lower_case_if_possible";
import { HighlightTextInSpan } from "../../../../search/components/HighlightTextInSpan";

/**
 * Renders a filter that is a list of radio buttons
 */
export function RadioFilter({
  selected_filters_,
  filter_,
  filter_query_,
}: {
  filter_: Accessor<SearchFilter>;
  selected_filters_: Signal<{ field: string; op: string; data: any }[]>;
  i18n_: solid_plp_shared_i18n;
  view_more_button_below_group_: Signal<solid_JSX.Element>;
  filter_query_?: Accessor<string | undefined>;
}) {
  const radio_name = make_random_classname();
  const existing_filter = createMemo(() => {
    const { op, field } = filter_();
    return selected_filters_[0]().find(
      ({ field: checking_field, op: checking_op }) => checking_field === field && checking_op === op
    );
  });

  return (
    <form class="radios">
      <Index each={(filter_().meta as ValuesFilterMeta).values}>
        {(value, index) => {
          const random_selector = make_random_classname();
          const count = createMemo(() => (filter_().meta as ValuesFilterMeta).counts?.[index]);
          const label = createMemo(() => {
            const name = (filter_().meta as ValuesFilterMeta)?.names?.[index];
            if (name) {
              return name;
            }
            const v = value();
            return Array.isArray(v) ? v.join(" - ") : v + "";
          });

          return (
            <label class="input-row" for={random_selector} classList={{ "count-0": count() === 0 }}>
              <div class="left">
                <input
                  type="radio"
                  id={random_selector}
                  name={radio_name}
                  checked={createMemo(() => {
                    const v = value();
                    const data = existing_filter()?.data;
                    if (to_lower_case_if_possible(data) === to_lower_case_if_possible(v)) {
                      return true;
                    }
                    return Array.isArray(data) && data.every((item, index) => item === (v as [number, number])[index]);
                  })()}
                  onChange={catchify(() => {
                    const filter_object = {
                      op: filter_().op,
                      field: filter_().field,
                      data: value(),
                    };
                    const set_filter = existing_filter();
                    const selected_filters = [...selected_filters_[0]()];
                    if (set_filter) {
                      selected_filters.splice(selected_filters.indexOf(set_filter), 1);
                    }
                    selected_filters.push(filter_object);
                    selected_filters_[1](selected_filters);
                  })}
                />
                <span class="custom-indicator"></span>
                {/* Don't show highlighted text when disabled because a) it's confusing and b) the highlighting color messed up the disableing color */}
                <Show when={count() !== 0} fallback={label()}>
                  <HighlightTextInSpan whole_text_to_display_={label} searching_for_value_={() => filter_query_?.()} />
                </Show>
              </div>
              <Show when={count() != undefined}>
                <span class="count">{count()}</span>
              </Show>
            </label>
          );
        }}
      </Index>
    </form>
  );
}
