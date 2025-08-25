import { ContentElement } from "../components/ContentElement";
import { Accessor, createEffect, createMemo, JSX, Resource, Signal, untrack } from "solid-js";
import { ContentBlock as BackendContentBlock } from "@depict-ai/types/api/GetListingResponse";
import { ContentBlock, ContentBlocksByRow } from "../../shared/components/PLPResults/create_content_blocks";
import { PseudoRouter } from "../../shared/helper_functions/pseudo_router";
import { GetListingResponseAfterDisplayTransformer } from "../types";

export type ContentBlockHistoryState = { blocks: BackendContentBlock[]; aspectRatios: Record<string, number> };

export function useBackendContentBlocks(
  history_content_blocks_: Signal<ContentBlockHistoryState>,
  plp_meta: Resource<(GetListingResponseAfterDisplayTransformer & { failed?: true | undefined }) | undefined>,
  content_blocks_by_row_: Accessor<ContentBlocksByRow | undefined>,
  router_: PseudoRouter,
  products_request_loading_: Accessor<boolean>
) {
  let hasSeenContentBlock = false;
  const [historyContentBlocks, setHistoryContentBlocks] = history_content_blocks_;
  const contentComponents = new Map<string, () => JSX.Element>();

  const delayedServerBlocks = createMemo<BackendContentBlock[] | undefined>(prev => {
    // Do not update the server blocks while the products request is loading, to avoid this: https://depictaiworkspace.slack.com/archives/C01JB6E7K7G/p1750861454651319
    if (products_request_loading_()) return prev;
    return plp_meta()?.content_blocks;
  });

  createEffect(() => {
    const serverContentBlock = delayedServerBlocks();
    const currentHistory = untrack(historyContentBlocks);
    // Only write to the history if the content blocks have changed when a new backend results arrives (we have them in history so scroll restoration works when going back, even when running shopify without single page navigations where our script dies inbetween pages).
    if (serverContentBlock && JSON.stringify(serverContentBlock) !== JSON.stringify(currentHistory.blocks)) {
      setHistoryContentBlocks({ ...currentHistory, blocks: serverContentBlock });
    }
  });

  const contentBlocksByRow = createMemo(() => {
    const developerProvided = content_blocks_by_row_();
    const { blocks: blocksFromHistory } = historyContentBlocks();
    // If we didn't get any content blocks (backend always return empty array) and we haven't seen any content blocks yet, return undefined
    // This is so the result rendering (PLPResults) will still use flexbox provided rendering on existing customers, so adding this isn't a breaking change
    // We don't want to switch rendering method every time one switches between a collection that hasn't vs has content blocks though, so once we've seen one content block we'll switch to css-grid-based rendering
    if (!blocksFromHistory?.length && !hasSeenContentBlock) return developerProvided;
    const content: (ContentBlock | undefined)[] = [...(developerProvided || [])];
    hasSeenContentBlock = true;

    blocksFromHistory.forEach(row => {
      const {
        content: { link, type, url },
      } = row;
      // Key the "content"-component by the link, type and url, so we can reuse the component (and later downstream the block elements) if it's the same
      // This makes the block not flicker when going backwards/forwards if the content is the same on both pages
      // Also it lets us rewrite the blocks state in the history based on the block aspect ratio without infinite looping
      const componentCacheKey = JSON.stringify([link, type, url]);
      let component = contentComponents.get(componentCacheKey);
      if (!component) {
        component = () => (
          <ContentElement
            link_={link}
            type_={type}
            mediaUrl_={url}
            router_={router_}
            aspectRatioWhenAloneInRow_={() => historyContentBlocks().aspectRatios[componentCacheKey]}
            // Save aspect ratio in history for when one goes back to a page on mobile where a content block takes the whole page width. Otherwise it would have a height of 0 while it's loading.
            setAspectRatioWas_={aspectRatio =>
              setHistoryContentBlocks(prev => ({
                ...prev,
                aspectRatios: { ...prev.aspectRatios, [componentCacheKey]: Math.round(aspectRatio * 100) / 100 },
              }))
            }
          />
        );
        contentComponents.set(componentCacheKey, component);
      }
      const contentBlock = {
        span_columns: row.span_columns,
        span_rows: row.span_rows,
        position: row.position,
        content: component,
      } as ContentBlock;
      content[row.row] = contentBlock;
    });
    return content;
  });

  return contentBlocksByRow;
}
