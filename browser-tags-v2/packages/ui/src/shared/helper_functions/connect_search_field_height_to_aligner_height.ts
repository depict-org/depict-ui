import { catchify } from "@depict-ai/utilishared";
import { styles_to_valid_css_string } from "./css_properties_to_css_string/css_properties_to_css_string";

/**
 * Connects the height of the search field to the height of the aligner.
 * @param aligner
 * @returns
 */
export function connect_search_field_height_to_aligner_height(aligner: HTMLElement) {
  const style_element = document.createElement("style");
  document.head.append(style_element);

  const resize_observer = new ResizeObserver(
    catchify(() => {
      const styles = styles_to_valid_css_string({
        ".depict.plp .depict-search-modal .search-field": {
          "height": `${aligner?.clientHeight}px`,
        },
      });

      style_element.replaceChildren(styles);
    })
  );

  resize_observer.observe(aligner);

  const cleanup = () => {
    resize_observer.disconnect();
    style_element.remove();
  };

  return { cleanup };
}
