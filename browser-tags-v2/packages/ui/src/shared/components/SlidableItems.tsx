/** @jsxImportSource solid-js */
import {
  Accessor,
  createContext,
  createEffect,
  createSignal,
  JSX as solid_JSX,
  onCleanup,
  Show,
  useContext,
} from "solid-js";
import { insert, isServer } from "solid-js/web";
import { Amazing_Slider, slider_fading_factory, slider_snap_css } from "@depict-ai/utilishared";
import { GenericSliderArrowButton } from "./icons/GenericSliderArrowButton";

const SlidableContext = /*@__PURE__*/ createContext<{
  slider_: Amazing_Slider;
  intersectionEntries_: Accessor<IntersectionObserverEntry[]>;
}>();

export function SlidableItems(props: {
  children?: solid_JSX.Element;
  slider_ref_?: (slider: Amazing_Slider) => any;
  faded_opacity_?: number;
  disable_fading_?: boolean;
  snapAlign_?: "start" | "end" | "center";
  fadingThreshold_?: number;
  mutation_plugins_?: ((
    this: Amazing_Slider,
    mutations: IntersectionObserverEntry[],
    intersecting_items: Record<number, IntersectionObserverEntry>
  ) => unknown)[];
  arrow_width_?: number;
  arrow_height_?: number;
  showArrow_?: boolean;
}) {
  const {
    slider_ref_,
    faded_opacity_ = 0.7,
    mutation_plugins_ = [],
    disable_fading_,
    snapAlign_,
    fadingThreshold_ = 0.96,
  } = props;
  const [hasHydrated, setHasHydrated] = createSignal(false);
  const shouldShowArrows = () => props.showArrow_ !== false;
  createEffect(() => setHasHydrated(true));

  const MakeButton = () =>
    (
      <div>
        <GenericSliderArrowButton height_={props.arrow_height_} width_={props.arrow_width_} />
      </div>
    ) as HTMLDivElement;

  // To support SSR it would be very hard to make Amazing_Slider compatible with solid's SSR because it would have to be rewritten in a more JSX way
  // However, all it would do on the server (when used by SlidableItems) is creating the following 5 div elements
  // Therefore, we just bail on the server (and first render on the client which is the hydration) and return a static version of the slider
  // Once we have hydrated, we construct and insert the actual slider
  return (
    <Show
      when={hasHydrated() && !isServer}
      fallback={
        <div class="depict-slider depict">
          <Show when={shouldShowArrows()}>
            <button aria-label="Scroll left" class="left d-navbutton" type="button">
              <MakeButton />
            </button>
            <button aria-label="Scroll right" class="right d-navbutton" type="button">
              <MakeButton />
            </button>
          </Show>
          <div class="sliding">{props.children}</div>
        </div>
      }
    >
      {(() => {
        const [intersectionEntries_, setIntersectionEntries] = createSignal<IntersectionObserverEntry[]>([]);
        const fading_plugin = disable_fading_
          ? undefined
          : slider_fading_factory({ threshold_: fadingThreshold_, faded_opacity_ });
        const slider = new Amazing_Slider({
          button_contents: {
            left: [MakeButton()],
            right: [MakeButton()],
          },
          constructor_plugins: [
            slider_snap_css(0, { align: snapAlign_ }).constructor_plugin,
            ...(fading_plugin ? [fading_plugin.constructor_plugin] : []),
          ],
          mutation_plugins: [
            ...(fading_plugin ? [fading_plugin.mutation_plugin_] : []),
            ...mutation_plugins_,
            entries => setIntersectionEntries(entries),
          ],
        });
        const { left_, right_ } = slider.elements_;

        createEffect(() => (left_.style.display = shouldShowArrows() ? "" : "none"));
        createEffect(() => (right_.style.display = shouldShowArrows() ? "" : "none"));

        insert(slider.insert_here as HTMLDivElement, () => (
          <SlidableContext.Provider value={{ slider_: slider, intersectionEntries_ }}>
            {props.children}
          </SlidableContext.Provider>
        ));
        onCleanup(() => slider.observer.disconnect());
        slider_ref_?.(slider);

        return slider.container as HTMLDivElement;
      })()}
    </Show>
  );
}

/**
 * Use this inside the children of a <SlidableItems> component to get the slider instance and a signal that contains the latest intersection obsrever entries (note they are accessible on the slider instance in a processed format already at the time this acessor updates)
 */
export function useSlidableInformation() {
  return useContext(SlidableContext);
}
