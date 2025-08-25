/** @jsxImportSource solid-js */
import { Accessor, batch, createMemo, createSignal, Show } from "solid-js";
import { HierarchicalValuesFilterMeta, SearchFilter, ValuesFilterMeta } from "@depict-ai/types/api/SearchResponse";
import { SolidFormatPrice } from "../../../helper_functions/solid_format_price";
import { solid_plp_shared_i18n } from "../../../../locales/i18n_types";
import { TickIcon } from "../../icons/TickIcon";
import { to_lower_case_if_possible } from "../../../helper_functions/to_lower_case_if_possible";

export function SelectedSummary({
  selected_filters_in_group_,
  i18n_: { price_formatting_ },
}: {
  i18n_: solid_plp_shared_i18n;
  selected_filters_in_group_: Accessor<
    Map<
      {
        field: string;
        op: SearchFilter["op"];
        data: any;
      },
      SearchFilter
    >
  >;
}) {
  const [show_tick_icon, set_show_tick_icon] = createSignal(false);
  const text = createMemo(() =>
    batch(() => {
      set_show_tick_icon(false);
      let { size } = selected_filters_in_group_();
      try_specific: {
        if (size > 1) {
          break try_specific;
        }
        for (const [selected_filter, filter_data] of selected_filters_in_group_()) {
          // we're intentionally not looping in this statement since we always just want to show the first thing in the filter group
          const { meta } = filter_data;
          const { type } = meta!;
          if (type === "range") {
            return (
              <>
                {price_formatting_().pre_}
                <SolidFormatPrice price_={selected_filter.data[0]} price_formatting_={price_formatting_()} />
                {price_formatting_().post_} – {price_formatting_().pre_}
                <SolidFormatPrice price_={selected_filter.data[1]} price_formatting_={price_formatting_()} />
                {price_formatting_().post_}
              </>
            );
          } else {
            const { data } = selected_filter;
            const data_is_array = Array.isArray(data);
            if (data_is_array && data.length !== 1) {
              size = data.length;
              break try_specific;
            }
            const needle = data_is_array ? data[0] : data;
            const index_in_meta = (meta as ValuesFilterMeta | HierarchicalValuesFilterMeta).values.findIndex(
              (value: ((string | number | [number, number])[] | (string | number)[][])[number]) =>
                to_lower_case_if_possible(needle) === to_lower_case_if_possible(value) ||
                (Array.isArray(needle) &&
                  Array.isArray(value) &&
                  needle.length === value.length &&
                  value.every(
                    (item, index) => to_lower_case_if_possible(needle[index]) === to_lower_case_if_possible(item)
                  ))
            );

            return (
              (meta as ValuesFilterMeta | HierarchicalValuesFilterMeta).names?.[index_in_meta] ||
              (meta as ValuesFilterMeta | HierarchicalValuesFilterMeta).values?.[index_in_meta]
            );
          }
        }
      }
      set_show_tick_icon(true);
      return size + "";
    })
  );

  return (
    <span class="show-selected" aria-hidden={"true"}>
      <span>{text()}</span>
      <Show when={show_tick_icon()}>
        <TickIcon />
      </Show>
    </span>
  );
}
