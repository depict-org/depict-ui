/** @jsxImportSource solid-js */
import { Accessor, batch, createMemo, createSignal, JSX as solid_JSX } from "solid-js";

/**
 * Makes a component to use for the text in the suggestions, it will highlight the text that's *new* to the text the suggestions are for
 */
export function HighlightTextInSpan({
  whole_text_to_display_: whole_text_to_display_memo,
  searching_for_value_: searching_for_value_memo,
  class_,
}: {
  whole_text_to_display_: Accessor<string>;
  searching_for_value_: Accessor<string | undefined>;
  class_?: string;
}) {
  const [get_has_highlighted, set_has_highlighted] = createSignal(false);
  const text_itself = createMemo(() =>
    batch(() => {
      set_has_highlighted(false);
      const searching_for_value = searching_for_value_memo();
      const whole_text_to_display_ = whole_text_to_display_memo();
      let for_black = "";
      let pushed_grey = false;
      const search_q = searching_for_value;
      if (!search_q) {
        return whole_text_to_display_;
      }
      const output: solid_JSX.Element = [];
      const searching_for = search_q.toLowerCase();
      const push_black = () => {
        if (for_black) {
          set_has_highlighted(true);
          output.push(<span class="highlighted-part">{for_black}</span>); // "black"
          for_black = "";
        }
      };

      for (let i = 0; i < whole_text_to_display_.length; ) {
        let is_whole_word = true;
        let searching_for_but_with_texts_casing = "";
        const i_at_start = i;
        for (let j = 0; j < searching_for.length; i++, j++) {
          const letter_in_suggestion = whole_text_to_display_[i] as string | undefined;
          if (letter_in_suggestion?.toLowerCase() !== searching_for[j]) {
            is_whole_word = false;
            i = i_at_start;
            break;
          }
          searching_for_but_with_texts_casing += letter_in_suggestion;
        }
        if (is_whole_word) {
          push_black();
          output.push(searching_for_but_with_texts_casing);
          pushed_grey = true;
        } else {
          for_black += whole_text_to_display_[i++];
        }
      }
      push_black();
      if (!pushed_grey) {
        set_has_highlighted(false);
        return whole_text_to_display_;
      }
      return output;
    })
  );
  return (
    <span
      class={class_}
      classList={{ "has-match": get_has_highlighted() }}
      title={whole_text_to_display_memo() /* for when line-clamped, users can see full text on hover */}
    >
      {text_itself()}
    </span>
  );
}
