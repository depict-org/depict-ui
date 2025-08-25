/** @jsxImportSource solid-js */
import { createMemo, Index, Show } from "solid-js";
import { segment_text } from "../../search/components/HighlightedPossiblyCutContent";

/**
 * Highlights the specified text, in our case the text the user searched for. The opposite of HighlightTextInSpan.
 * Usually one wants to highlight the new text, since that's what should draw attention. In this case though there are so many superflous options (that we don't want to hide because maybe the user looks for futher refinement below what they searched for) that it would become bloated and it's better to highlight exactly what they searched for.
 */
export function HighlightSpecifiedText(props: { text_: string; to_highlight_?: string }) {
  const segmented_text = createMemo(() => {
    const { to_highlight_, text_ } = props;
    return segment_text(text_, to_highlight_ ? [to_highlight_] : [], true);
  });
  const has_highlights = createMemo(() => segmented_text()!.some(segment => segment.highlighted_));

  return (
    <span title={props.text_} classList={{ "has-match": has_highlights() }}>
      <Index each={segmented_text()}>
        {item => {
          return (
            <Show when={item().highlighted_} fallback={item().text_}>
              <span class="highlighted-part">{item().text_}</span>
            </Show>
          );
        }}
      </Index>
    </span>
  );
}
