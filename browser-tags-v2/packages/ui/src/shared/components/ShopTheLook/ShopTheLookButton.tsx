/** @jsxImportSource solid-js */
import { modal_opener } from "../../../search/helper_functions/modal_opener";
import { add_version_query_params, base_url, catchify, Display, dwarn, get_session_id } from "@depict-ai/utilishared";
import {
  createEffect,
  createMemo,
  createResource,
  createRoot,
  ErrorBoundary,
  getOwner,
  JSX,
  mergeProps,
  runWithOwner,
  splitProps,
} from "solid-js";
import { history_dot_state_to_state } from "../../helper_functions/history_dot_state_to_state";
import { prefixes_to_preserve_in_history_dot_state } from "../../helper_functions/preserve_items_in_history_dot_state";
import { InternalShopTheLookOpenModalOptions, ShopTheLookModal, ShopTheLookOpenModalOptions } from "./ShopTheLookModal";
import { RecommendRequestV3 } from "@depict-ai/types/api/RecommendRequestV3";

type ShopTheLookButtonProps<T extends Display> = ShopTheLookOpenModalOptions<T> & {
  buttonAttributes?: JSX.ButtonHTMLAttributes<HTMLButtonElement>;
};

const CANT_FETCH = "Failed fetching shop the look recommendations";

let setModalShouldBeOpen: ReturnType<typeof actualSetupModal> | undefined;
let modalProps: InternalShopTheLookOpenModalOptions<any>;
export function ShopTheLookButton<T extends Display>(props: ShopTheLookButtonProps<T>) {
  return (
    <ErrorBoundary fallback={() => <div>{CANT_FETCH}</div>}>
      <ActualShopTheLookButton {...props} />
    </ErrorBoundary>
  );
}

function ActualShopTheLookButton<T extends Display>(props: ShopTheLookButtonProps<T>) {
  const [products_to_shop_] = createResource(
    () => ({
      merchant: props.merchant,
      market: props.market,
      locale: props.locale,
      product_ids: [props.productId],
      type: "shop_the_look",
      session_id: get_session_id(),
    }),
    async (request: RecommendRequestV3) => {
      const response = await fetch(add_version_query_params(`${base_url}/v3/shop-the-look`), {
        method: "POST",
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        dwarn(response);
        throw new Error(CANT_FETCH);
      }
      const decoded = await response.json();
      return decoded as { shop_the_look: Record<string, T[]> };
    }
  );

  const [localProps, partForModal] = splitProps(props, ["buttonAttributes"]);
  const { openModal, closeModal } = useShopTheLookModal();
  const hasAnythingToShow = createMemo(() => Object.entries(products_to_shop_()?.shop_the_look || {}).length);
  const displayStyleValue = createMemo(() => (hasAnythingToShow() ? "" : "none"));
  const button = (
    <button {...localProps.buttonAttributes}>{localProps?.buttonAttributes?.children || "Shop the look"}</button>
  ) as HTMLButtonElement;

  createEffect(() => (button.style.display = displayStyleValue())); // Set our attributes like this, so we allow total control over the button from the outside via buttonAttributes
  createEffect(() => !hasAnythingToShow() && closeModal()); // close modal if we ever get into the state of having it open and not having anything to show

  modalProps = mergeProps(partForModal, { products_to_shop_ });
  button.addEventListener("click", openModal);

  return button;
}

/**
 * This does not need to be run in a root at all, it will create a root every time the modal is opened and then tear it down when the modal is closed again
 */
function useShopTheLookModal() {
  if (setModalShouldBeOpen) {
    return setModalShouldBeOpen;
  }
  return (setModalShouldBeOpen = createRoot(() => actualSetupModal()));
}

function actualSetupModal<T extends Display>() {
  // Save modal state in history so modal is still open after people go back
  const history_key = "depict_shop_the_look_open";
  const {
    [history_key]: [history_value, set_history_value],
  } = history_dot_state_to_state({ [history_key]: false }, {
    navigate_: {
      replace_state_: (new_state: { [key: string]: any }) => globalThis?.history?.replaceState(new_state, ""),
    },
  } as any);
  prefixes_to_preserve_in_history_dot_state.add(history_key);
  const actually_close_modal_ = () => set_history_value(false);
  const owner = getOwner()!;

  catchify(async () => {
    const { open_modal_, close_modal_ } = await modal_opener<
      { actually_close_modal_: VoidFunction },
      InternalShopTheLookOpenModalOptions<T>
    >(ShopTheLookModal, { actually_close_modal_ });
    runWithOwner(owner, () =>
      createEffect(() => {
        if (history_value()) {
          open_modal_(modalProps);
        } else {
          close_modal_();
        }
      })
    );
  })();

  return {
    openModal: () => set_history_value(true),
    closeModal: actually_close_modal_,
  };
}
