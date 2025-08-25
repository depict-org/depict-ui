import { GeneralSideSlidein } from "./GeneralSideSlidein";
import { make_asyncIterable_exiter } from "../utilities/infinite_promise/make_asynciterable_exitable";
import { catchify } from "../logging/error";
import { iterable_to_elems } from "../utilities/infinite_promise/iterable_to_elems";
import { IPNS } from "../utilities/infinite_promise/async_iterable_ipns";

export async function GeneralSizeSelector({
  title_,
  items_,
  out_of_stock_text_,
  CloseIcon,
}: {
  title_: IPNS<string>;
  out_of_stock_text_: IPNS<string>;
  items_: { id_: string; size_name_: string; is_available_: boolean }[];
  CloseIcon: () => HTMLElement | SVGElement;
}) {
  const [exit_oos_iterator, exitable_oos_iterator] = make_asyncIterable_exiter(out_of_stock_text_);
  // eslint-disable-line  no-async-promise-executor
  return new Promise<string | void>(
    catchify(async size_selected => {
      const { close_, on_close_ } = await GeneralSideSlidein({
        CloseIcon,
        title_,
        children: [
          (
            <div class="option-list">
              {items_.map(({ size_name_, is_available_, id_ }) => {
                const button = (
                  <button
                    type="button"
                    class={"option" + (is_available_ ? " available" : "")}
                    onClick={() => {
                      size_selected(id_);
                      close_();
                    }}
                  >
                    <span class="size">{size_name_}</span>
                    {!is_available_ && <span class="sold-out">{iterable_to_elems(exitable_oos_iterator)}</span>}
                  </button>
                ) as HTMLButtonElement;
                if (!is_available_) {
                  button.disabled = true;
                }
                return button;
              })}
            </div>
          ) as HTMLDivElement,
        ],
      });
      on_close_(size_selected);
      on_close_(exit_oos_iterator);
    })
  );
}
