/** @jsxImportSource solid-js */
import { Accessor, createMemo, Index, Show, Signal } from "solid-js";
import { SortMeta, SortModel } from "@depict-ai/types/api/SearchRequestV3";
import { catchify, make_random_classname } from "@depict-ai/utilishared";
import { WithRequired } from "../../types";
import { TextPlaceholder } from "../Placeholders/TextPlaceholder";

type ItemWithObligatoryMeta = Accessor<WithRequired<SortModel, "meta">>;

export function SortBody({
  available_sortings_,
  current_sorting_: [get_current_sorting, set_current_sorting],
  meta_of_currently_selected_sorting_,
}: {
  available_sortings_: Accessor<SortModel[] | undefined>;
  current_sorting_: Signal<SortModel | undefined>;
  meta_of_currently_selected_sorting_: Accessor<SortMeta | undefined>;
}) {
  const title_radio_name = make_random_classname();
  const order_radio_name = make_random_classname();

  return (
    <Show
      when={available_sortings_()?.length}
      fallback={
        <div class="sorting-attributes">
          {Array.from({ length: 4 }).map(() => (
            <div>
              <div class="input-row">
                <input type="radio" disabled={true} />
                <span class="custom-indicator"></span>
                <TextPlaceholder height="1.2em" width="100%" />
              </div>
            </div>
          ))}
        </div>
      }
    >
      <div class="sorting-attributes">
        <Index
          each={
            (available_sortings_()?.filter?.(sorting => sorting.meta?.title) ||
              []) as ReturnType<ItemWithObligatoryMeta>[]
          }
        >
          {(item, index) => {
            const is_checked = createMemo(() => {
              const sort = get_current_sorting();
              if (!sort) {
                // if no sortings are selected, "select" first sort
                return index === 0;
              }
              return (
                sort.field === item().field &&
                (sort.order === item().order || (item().meta.values?.length as number) > 1)
              );
            });
            return (
              /* wrapping div for flex gap polyfill scss mixin */
              <div>
                <label class="input-row">
                  <input
                    type="radio"
                    name={title_radio_name}
                    checked={is_checked()}
                    onChange={catchify(() => set_current_sorting(item()))}
                  />
                  <span class="custom-indicator"></span>
                  {item().meta!.title}
                </label>
              </div>
            );
          }}
        </Index>
      </div>

      <Show when={(meta_of_currently_selected_sorting_()?.values?.length as number) > 1}>
        <div class="sorting-direction">
          <Index each={meta_of_currently_selected_sorting_()?.values}>
            {(order_value, index) => {
              const is_checked = createMemo(() => get_current_sorting()?.order === order_value());

              return (
                <div>
                  <label class="input-row">
                    <input
                      type="radio"
                      name={order_radio_name}
                      checked={is_checked()}
                      onChange={catchify(() => set_current_sorting(c => c && { ...c, order: order_value() }))}
                    />
                    <span class="custom-indicator"></span>
                    {meta_of_currently_selected_sorting_()?.names?.[index]}
                  </label>
                </div>
              );
            }}
          </Index>
        </div>
      </Show>
    </Show>
  );
}
