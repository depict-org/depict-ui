/** @jsxImportSource solid-js */
import { PseudoRouter } from "../../shared/helper_functions/pseudo_router";
import { Accessor, JSX as solid_JSX, Show } from "solid-js";
import { FileTextIcon } from "../../shared/components/icons/FileTextIcon";
import { HighlightedPossiblyCutContent } from "./HighlightedPossiblyCutContent";
import { TextPlaceholder } from "../../shared/components/Placeholders/TextPlaceholder";
import { ContentLink } from "@depict-ai/types/api/SearchResponse";
import { catchify } from "@depict-ai/utilishared";

/**
 * Both placeholder and actual content results card component (this is one content result in the SearchPage)
 */
export function ContentCard({
  router_,
  content_result_,
}: { router_: PseudoRouter; content_result_: Accessor<ContentLink> } | { router_?: never; content_result_?: never }) {
  const make_link_attributes = () => {
    const result = content_result_?.();
    if (!result) return;
    return {
      href: result.page_url,
      onClick: catchify((ev: MouseEvent) =>
        router_!.navigate_.go_to_({
          new_url_: result.page_url,
          is_replace_: false,
          event_: ev,
        })
      ),
    };
  };
  const LinkIfPossible = ({
    children,
    ...attributes
  }: { children: solid_JSX.Element } & solid_JSX.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (content_result_) return <a {...attributes}>{children}</a>;
    return <div {...(attributes as solid_JSX.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
  };

  return (
    <div class="content-card">
      <div class="image">
        <LinkIfPossible {...make_link_attributes()} tabIndex="-1">
          <FileTextIcon width="28" height="28" />
        </LinkIfPossible>
      </div>
      <div class="info">
        <LinkIfPossible class="content-title line-clamp" {...make_link_attributes()} title={content_result_?.().title}>
          {content_result_ ? (
            <HighlightedPossiblyCutContent content_result_={content_result_} key_="title" cut_when_possible_={false} />
          ) : (
            <TextPlaceholder height="1em" width="10ch" />
          )}
        </LinkIfPossible>

        <Show when={content_result_?.().description}>
          <div class="description line-clamp">
            <Show
              when={content_result_}
              fallback={Array.from({ length: 4 }).map(() => (
                // Add 4 placeholder elements to give people configuring -webkit-line-clamp a bit more leeway
                <TextPlaceholder height="1em" width="min(50ch, 100%)" />
              ))}
            >
              <HighlightedPossiblyCutContent
                content_result_={content_result_!}
                key_="description"
                cut_when_possible_={true}
              />
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}
