import { catchify, observer, report } from "@depict-ai/utilishared/latest";
import { PseudoRouter } from "../../shared/helper_functions/pseudo_router";
import { useVisibilityState } from "../../shared/helper_functions/useVisibilityState";
import { Accessor, createEffect, createSignal, getOwner, Match, runWithOwner, Show, Switch } from "solid-js";
import { dlog } from "@depict-ai/utilishared";
import { Dynamic } from "solid-js/web";
import { ModernResponsiveImage } from "../../shared/components/ModernResponsiveContainedImage";
import { makeSizeAccessors } from "../../shared/components/shopify/makeSizeAccessors";
import { ImagePlaceholder } from "../../shared/components/Placeholders/ImagePlaceholder";
import { loadHlsPolyfill } from "../helpers/loadHlsPolyfill";

export function ContentElement({
  link_,
  type_,
  router_,
  setAspectRatioWas_,
  mediaUrl_,
  aspectRatioWhenAloneInRow_,
}: {
  link_: null | string;
  type_: "image" | "video" | undefined;
  mediaUrl_: string;
  router_: PseudoRouter;
  setAspectRatioWas_: (aspectRatio: number) => void;
  aspectRatioWhenAloneInRow_: Accessor<number | undefined>;
}) {
  let wroteAspectRatioToContainer = false; // Only write this once so we don't get into a aspect ratio changed -> size changed -> image source changed -> aspect ratio slightly changed infinite loop
  const [wrapperSize, setWrapperSize] = createSignal<[Accessor<number>, Accessor<number>] | undefined>();
  const [hasLoaded, setHasLoaded] = createSignal(false);
  const isImage = type_ === "image";
  const setAspectRatio = (aspectRatio: number) => {
    if (wroteAspectRatioToContainer) return;
    wroteAspectRatioToContainer = true;
    setAspectRatioWas_(aspectRatio);
  };

  return (
    <Dynamic
      component={link_ ? "a" : "div"}
      class="d-standard-content-wrapper"
      style={aspectRatioWhenAloneInRow_() ? `--media-aspect-ratio: ${aspectRatioWhenAloneInRow_()}` : ""}
      ref={el => isImage && setWrapperSize(() => makeSizeAccessors(el))}
      onClick={catchify(
        (ev: MouseEvent) =>
          link_ &&
          router_.navigate_.go_to_({
            new_url_: link_,
            is_replace_: false,
            event_: ev,
          })
      )}
      {...(link_ && { href: link_ })}
    >
      {/* Hide placeholder once image is shown in case it has transparency */}
      <Show when={!hasLoaded()}>
        <ImagePlaceholder width="100%" height="100%" />
      </Show>
      <Switch>
        <Match when={isImage}>
          <ModernResponsiveImage
            size={() => wrapperSize()?.[0]?.() || 0}
            sizeHeight={() => wrapperSize()?.[1]?.() || 0}
            src={mediaUrl_}
            class="d-standard-content"
            // Use this because after load the image might not be decoded yet
            onDecoded={() => setHasLoaded(true)}
            ref={el =>
              el.addEventListener(
                "load",
                catchify(() => setAspectRatio(el.naturalWidth / el.naturalHeight))
              )
            }
          />
        </Match>
        <Match when={type_ === "video"}>
          <video
            src={mediaUrl_}
            disablepictureinpicture={true}
            class="d-standard-content"
            onPlaying={() => setHasLoaded(true)}
            ref={catchify(async element => {
              const pageVisible = useVisibilityState();
              const owner = getOwner();
              const [retryPlayToggle, setRetryPlayToggle] = createSignal(false);

              element.addEventListener(
                "loadedmetadata",
                catchify(() => setAspectRatio(element.videoWidth / element.videoHeight))
              );
              // Work around https://github.com/ryansolid/dom-expressions/issues/384
              element.controls = false;
              element.muted = true;
              element.autoplay = true;
              element.playsInline = true;
              element.loop = true;

              // If hls is not supported, dynamically import hls.js as polyfill
              if (mediaUrl_.includes(".m3u8") && !element.canPlayType("application/vnd.apple.mpegurl")) {
                const hlsJs = await loadHlsPolyfill().catch(e => report([e, "Failed to load hls.js"], "error"));
                if (!hlsJs || !hlsJs.isSupported()) return;
                const hls = new hlsJs.default();
                hls.loadSource(mediaUrl_);
                hls.attachMedia(element);
              }

              // need runWithOwner for createEffect, because we potentially awaited above
              runWithOwner(owner, () =>
                createEffect(() => {
                  retryPlayToggle();
                  if (pageVisible()) {
                    element.play().catch(async e => {
                      dlog("Failed to play", e);
                      // If we're not in the DOM yet, wait until we are and then try again
                      if (!document.documentElement.contains(element)) {
                        await observer.wait_for_element(element);
                        setRetryPlayToggle(prev => !prev);
                      }
                    });
                  } else {
                    element.pause();
                  }
                })
              );
            })}
          />
        </Match>
      </Switch>
    </Dynamic>
  );
}
