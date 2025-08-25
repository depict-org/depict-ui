/** @jsxImportSource solid-js */
import { Accessor, createMemo, Index, Show } from "solid-js";
import { ContentLink } from "@depict-ai/types/api/SearchResponse";

const dont_cut_in_between_less_than_characters = 30;

/**
 * Highlights and cuts text content for content search results (doesn't cut if cut_when_possible_ is false)
 * Example input (query: returns): Shipping & Delivery
 *
 * Free Shipping within Sweden
 * We have free shipping on all orders within Sweden. Your order will be sent with PostNord or Budbee. You will receive a text message on the mobile number you leave when ordering.
 *
 * 1-3 Days Delivery
 * All orders placed before 12 am UTC +1, workdays, are normally sent out the same day. All orders in Sweden are sent with PostNord or Budbee. Delivery times 1-3 days.
 *
 * Unclaimed Packages
 * If we receive packages from a customer/recipient who has refused the package sent them, we reserve the right to charge the customer for all the costs incurred in such return + a handling cost of 300 SEK.
 *
 * Responsible for Goods
 * Houdini Sportswear AB is responsible if the goods are damaged on the way to you. Please contact our customer service as soon as possible, but no later than within 60 days from placing your order.
 *
 * Contact Customer Service:
 * customercare@houdinisportswear.com
 * Open weekdays 9 am-5 pm (Central European time)
 *
 * FAQ
 *
 * Contact us
 *
 * Shipping & Delivery
 *
 * Returns & Exchange
 *
 * Terms & Conditions
 *
 * Privacy policy & Cookies
 *
 * Product Lifetime Warranty
 *
 * Houdini Sportswear. All rights reserved.
 * Example output: … customer for all the costs incurred in such *return* + a … Delivery ™Return™s & Exchange Terms & Conditio…
 */
export function HighlightedPossiblyCutContent({
  content_result_,
  key_,
  cut_when_possible_,
}: {
  content_result_: Accessor<ContentLink>;
  key_: "title" | "description";
  cut_when_possible_: boolean;
}) {
  const matched_tokens = createMemo(
    () => content_result_().highlights?.find(highlight => highlight.field == key_)?.matched_tokens
  );
  const full_value = createMemo(() => content_result_()[key_]?.replaceAll("\n", " "));

  return (
    <Show when={matched_tokens()?.length} fallback={full_value()}>
      {(() => {
        const segmented_cut_text = createMemo(() => {
          const segmented_text = segment_text(full_value(), matched_tokens()!);
          if (cut_when_possible_) {
            cut_text(segmented_text);
          }
          return segmented_text;
        });

        return (
          // to minimize DOM updates a bit. Ideally we'd use <For> but I can't figure out how
          <Index each={segmented_cut_text()}>
            {item => {
              return (
                <Show when={item().highlighted_} fallback={item().text_}>
                  <span class="highlighted-part">{item().text_}</span>
                </Show>
              );
            }}
          </Index>
        );
      })()}
    </Show>
  );
}

function cut_text(segmented_text: { text_: string; highlighted_: boolean }[] | undefined) {
  // cut away chunks of text that are not highlighted to give a google-like overview of the content
  const highlighted_segments = segmented_text?.filter(segment => segment.highlighted_);
  if (!segmented_text || !highlighted_segments?.length) return;
  // We have one or more highlighted segments
  if (highlighted_segments.length === 1) {
    // cut away from the left until the start of the highlighted sentence if just one sentence is highlighted
    cut_start(segmented_text.indexOf(highlighted_segments[0]), segmented_text);
    return;
  }
  // We have two or more highlighted segments, take the two biggest chunks and show them + a bit text around
  const sorted_highlighted_segments = [...highlighted_segments].sort(
    (a, b) => b.text_.trim().length - a.text_.trim().length // trim to avoid unfair comparisons due to whitespace
  );
  const [longest_segment, next_longest_segment] = sorted_highlighted_segments;
  // We need to cut before the first segment - possibly through other segments - and maybe between segments
  let [index_of_first_segment, index_of_second_segment] = [
    segmented_text.indexOf(longest_segment),
    segmented_text.indexOf(next_longest_segment),
  ].sort((a, b) => a - b);

  cut_start(index_of_first_segment, segmented_text);

  // update indexes since we might have removed segments
  [index_of_first_segment, index_of_second_segment] = [
    segmented_text.indexOf(longest_segment),
    segmented_text.indexOf(next_longest_segment),
  ].sort((a, b) => a - b);

  let number_of_characters_between_segments = 0;
  for (let i = index_of_first_segment + 1; i < index_of_second_segment; i++) {
    const segment = segmented_text[i];
    number_of_characters_between_segments += segment.text_.length;
  }
  if (number_of_characters_between_segments < dont_cut_in_between_less_than_characters) {
    // don't cut if there are less than 30 characters between the two segments
    return;
  }

  // We have more than 50 characters between the two segments, cut between them
  const [split_start_segment, split_start_character] = find_split_point(
    index_of_first_segment,
    index_of_second_segment,
    segmented_text
  );
  const [split_end_segment, split_end_character] = find_split_point(
    index_of_second_segment,
    index_of_first_segment,
    segmented_text
  );

  if (
    split_start_segment === undefined ||
    split_end_segment === undefined ||
    // identical split point, or split end before split start, can't do anything
    (split_start_segment == split_end_segment && split_start_character >= split_end_character) ||
    split_start_segment > split_end_segment
  ) {
    return;
  }

  const dots_segment = { text_: " … ", highlighted_: false };

  const split_and_dotted_values = segmented_text.flatMap((segment, i) => {
    if (i < split_start_segment || i > split_end_segment) return segment;

    const text = segment.text_;
    if (i == split_end_segment && i == split_start_segment) {
      return [
        { ...segment, text_: text.slice(0, split_start_character).trimEnd() },
        dots_segment,
        { ...segment, text_: text.slice(split_end_character + 1, text.length).trimStart() },
      ];
    } else if (i == split_start_segment) {
      segment.text_ = text.slice(0, split_start_character).trimEnd(); // this would be split_start_character + 1, but we want to remove the last "dot" because . ... looks weird
      return segment;
    } else if (i == split_end_segment) {
      return [dots_segment, { ...segment, text_: text.slice(split_end_character + 1, text.length).trimStart() }];
    }
    return []; // remove all segments inbetween
  });

  segmented_text.splice(0, segmented_text.length, ...split_and_dotted_values); // Sorry…

  heal_holes(segmented_text);
}

function heal_holes(segmented_text: { text_: string; highlighted_: boolean }[]) {
  // try to heal "holes" created in the segments so there are only alternating segments
  const segments_to_delete = new Set<(typeof segmented_text)[number]>();
  for (let i = 0; i < segmented_text.length; i++) {
    const segment = segmented_text[i];
    let previous_segment: typeof segment | undefined;
    for (let j = i - 1; j >= 0; j--) {
      previous_segment = segmented_text[j];
      // Don't write to a segment that's marked for deletion or the contents we write to it will be deleted
      if (!segments_to_delete.has(previous_segment)) {
        break;
      }
    }
    if (
      (previous_segment?.highlighted_ && segment.highlighted_) ||
      (previous_segment?.highlighted_ === false && segment.highlighted_ === false)
    ) {
      previous_segment.text_ += segment.text_; // IDK if this ever happens
      segments_to_delete.add(segment);
    }
  }
  for (const segment of segments_to_delete) {
    const index = segmented_text.indexOf(segment);
    segmented_text.splice(index, 1);
  }
}

function find_split_point(
  index_of_start_segment: number,
  index_of_end_segment: number,
  segmented_text: { text_: string; highlighted_: boolean }[],
  be_very_aggressive = true
) {
  const should_loop_backwards = index_of_start_segment > index_of_end_segment;
  const step = should_loop_backwards ? -1 : 1;
  const desperate_split_attempts = [":", ";", ","];

  while (desperate_split_attempts.length) {
    const split_point_between_words: [number, number][] = [];
    // for the middle also try to split with a few more characters if the default ones don't work over a full run
    const desperate_split_attempt = desperate_split_attempts.pop();
    let is_first_character = true;

    for (
      let i = index_of_start_segment + step;
      should_loop_backwards ? i > index_of_end_segment : i < index_of_end_segment;
      i += step
    ) {
      const segment = segmented_text[i];
      const text = segment.text_;
      for (
        let j = should_loop_backwards ? text.length - 1 : 0;
        should_loop_backwards ? j >= 0 : j < text.length;
        j += step
      ) {
        const character = text[j];
        if (character == "." || character == "?" || character == "!" || character == desperate_split_attempt) {
          return [i, j] as const; // segment index, character index
        }
        if (is_first_character) {
          is_first_character = false;
          // ignore leading/trailing spaces
        } else if (be_very_aggressive && character == " ") {
          split_point_between_words.push([i, j]);
          if (split_point_between_words.length > 3) {
            // We can't find a split point, so we'll just split between words
            // This is because for UI reasons we only want to show 2 lines of text, so we need to be very aggressive with getting the second match soon
            return split_point_between_words[1];
          }
        }
      }
    }
  }
  return [] as unknown as [undefined, undefined];
}

function cut_start(cut_left_of_index: number, segmented_text: { text_: string; highlighted_: boolean }[]) {
  // Cut the start of the text to bring the first matching token
  let is_first_character = false;
  let words_encountered = 0;
  outmost_loop: for (let i = cut_left_of_index - 1; i >= 0; i--) {
    const segment = segmented_text[i];
    // We assume that two adjacent highlighted segments don't exist and have been merged if they were to have existed
    const text = segment.text_;
    for (let j = text.length - 1; j >= 0; j--) {
      const character = text[j];
      const is_space = character == " ";
      if (!is_first_character && is_space) {
        words_encountered++;
      }
      if (
        character == "." ||
        character == "?" ||
        character == "!" ||
        character == "," ||
        (words_encountered > 8 && is_space)
      ) {
        // We have to be really aggressive at the start of sentences so stuff can be seen on mobile, hence comma
        segment.text_ = text.slice(j + 1).trimStart();
        segmented_text.splice(0, i);
        if (character === "," || is_space) {
          // if we cut at a comma or psace, we add a … at the beginning
          segmented_text.unshift({ text_: "… ", highlighted_: false });
        }
        break outmost_loop;
      }
      if (is_first_character) {
        is_first_character = false;
      }
    }
  }
  heal_holes(segmented_text); // if we added a ... there could now be a sequence that's not alternating true/false
}

/**
 * segment text where the matched strings are highlighted sections
 * @param loose will match on single characters, middle of words, etc
 */
export function segment_text(text: string | undefined, matched_strings: string[], loose: boolean = false) {
  const output: { text_: string; highlighted_: boolean }[] = [];
  if (!text) return; // shouldn't happen but whatever
  for (let i = 0; i < text.length; i++) {
    const found_strings: string[] = [];
    if (!i || text[i - 1] == " " || loose) {
      // only match at the start of a word or string, it looks weird if i.e. "we" is highlighted in "activewear
      for (let j = 0; j < matched_strings.length; j++) {
        const matched_string = matched_strings[j];
        const part_in_text = text.slice(i, i + matched_string.length);
        if (matched_string.length < 2 && !loose) continue; // don't match on single characters, i.e. "I", it looks weird
        if (part_in_text.toLowerCase() === matched_string.toLowerCase()) {
          found_strings.push(part_in_text); // use the casing from the text, not from typesense, can look weird otherwise
        }
      }
    }
    const last_index_in_output = output.length - 1;
    if (!found_strings.length) {
      const character = text[i];
      if (output[last_index_in_output]?.highlighted_ === false || (output.length && /\s/.test(character))) {
        // always push whitespace characters to the last segment, this is because typesense doesn't see them as part of the matched tokens but we want to be able to detect "phat" matched segments
        output[last_index_in_output].text_ += character;
      } else {
        output.push({ highlighted_: false, text_: character });
      }
    } else {
      const longest_found_string = found_strings.reduce((a, b) => (a.length > b.length ? a : b));
      if (output[last_index_in_output]?.highlighted_) {
        output[last_index_in_output].text_ += longest_found_string;
      } else {
        output.push({ highlighted_: true, text_: longest_found_string });
      }
      i += longest_found_string.length - 1;
    }
  }
  return output;
}
