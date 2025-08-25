import { catchify } from "../logging/error";

interface ColorCircleProps {
  color: ColorObj;
  onClick: (colorCircle: HTMLElement, color: ColorObj) => unknown;
  onHoverUpdate: (colorCircle: HTMLElement, color: ColorObj, hovering: boolean) => unknown;
}

/**
 * Internal color circle used in ColorPicker
 * @see {createColorPicker}
 */
function ColorCircle({ color, onClick, onHoverUpdate }: ColorCircleProps) {
  const button = (
    <button class="color-circle-container" onClick={e => onClick(e.currentTarget, color)} title={color.label || ""}>
      <div class="outer-circle" style={`border-color: ${color.value};`}>
        <div class="inner-circle" style={`background-color: ${color.value};`}></div>
      </div>
    </button>
  ) as HTMLButtonElement;
  button.addEventListener(
    "mouseenter",
    catchify(() => onHoverUpdate(button, color, true))
  );
  button.addEventListener(
    "mouseleave",
    catchify(() => onHoverUpdate(button, color, false))
  );
  return button;
}

export type ColorObj = {
  /** the value passed as a css color */
  value: string;
  /** if specified, it's used as a title on hover */
  label?: string;
  /** Allow for arbitrary data to be passed */
  [key: string]: any;
};

interface ColorPickerProps {
  /** An array of colors that can be selected */
  colors: ColorObj[];
  onSelect: (color: ColorObj) => unknown;
  /**
   * Called everytime a color is hovered
   */
  onHoverUpdate?: (color: ColorObj, hovering: boolean) => unknown;
  /**
   * The color value to be initially selected. Can be omitted for no color to be selected.
   * If multiple colors use the same hex value, the label can also be specified (using a ColorObj)
   */
  initialColor?: string | ColorObj;
  /**
   * Enabled hovering preview. When true `onSelect` will be called with a new color when it's hovered,
   * then reverts back to the last clicked color when hovering is stopped
   * */
  selectOnHover?: boolean;
  /**
   * If set to true only `onSelect` will be called when an item is clicked
   */
  dontSetActiveOnClick?: boolean;
  /**
   * If only circles should be returned and not the container element
   */
  onlyCircles?: boolean;
}

/**
 * A color selector, that calls onSelect when a color is clicked and optionally on hover as well.
 */
export function createColorPicker({
  colors,
  initialColor,
  onSelect,
  selectOnHover = false,
  onHoverUpdate,
  dontSetActiveOnClick,
  onlyCircles,
}: ColorPickerProps) {
  let setActiveIndex: undefined | ((index: number) => void);
  // Don't actually construct anything if the component we return isn't used
  return {
    setActiveIndex: (index: number) => setActiveIndex?.(index),
    ColorPicker() {
      /** The currently active ColorCircle */
      let activeCircle: HTMLElement | null = null;
      /** The currently active color object */
      let activeColor: ColorObj | null = null;

      /**
       * Update the currently active color object and HTMLElement
       * Toggles the active class.
       */
      const setActive = (e: HTMLElement, color: ColorObj) => {
        if (e !== activeCircle) {
          if (activeCircle) activeCircle.classList.remove("active");
          e.classList.add("active");
          activeCircle = e;
          activeColor = color;
        }
      };

      const handleClick = function (clicked: HTMLElement, color: ColorObj) {
        if (!dontSetActiveOnClick) {
          setActive(clicked, color);
        }
        onSelect(color);
      };

      /**
       * Handles the preview logic.
       */
      const handleSelectOnHover = (hovered: HTMLElement, color: ColorObj, hovering: boolean) => {
        // Don't do any selection if the hovered circle is already selected
        if (hovered === activeCircle) return;
        if (hovering) {
          onSelect(color); // mouseenter - select a new color
        } else if (activeColor) {
          onSelect(activeColor); // mouseleave - select the last activeColor
        }
      };

      const handleHoverUpdate = function (hovered: HTMLElement, color: ColorObj, hovering: boolean) {
        // Pass the event up
        if (onHoverUpdate) onHoverUpdate(color, hovering);
        // If enabled, select the hovered color
        if (selectOnHover) handleSelectOnHover(hovered, color, hovering);
      };

      // Create the color circles
      const circles = colors.map(
        color =>
          (<ColorCircle color={color} onClick={handleClick} onHoverUpdate={handleHoverUpdate} />) as HTMLButtonElement
      );

      // Function to set active color to an index
      setActiveIndex = (index: number) => setActive(circles[index], colors[index]);

      // Set the initial color, if any
      const initial_index =
        initialColor == undefined
          ? -1
          : colors.findIndex(c =>
              typeof initialColor === "string"
                ? c.value === initialColor
                : c.value === initialColor.value && c.label === initialColor.label
            );
      if (initial_index > -1) {
        setActiveIndex(initial_index);
      }

      if (onlyCircles) {
        return circles as unknown as HTMLElement;
      }
      return (
        <div class="color-picker" role="form" aria-label="Color picker">
          {circles}
        </div>
      );
    },
  };
}
