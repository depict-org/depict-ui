/** @jsxImportSource solid-js */
import { ImagePlaceholder } from "../../shared/components/Placeholders/ImagePlaceholder";
import { TextPlaceholder } from "../../shared/components/Placeholders/TextPlaceholder";

export const aspectRatioOverrideCssVariableName = "--image-aspect-ratio";

export function DefaultInstantCardPlaceholder() {
  return (
    <div class="instant-card">
      <div class="img-part">
        <ImagePlaceholder aspectRatio={`var(${aspectRatioOverrideCssVariableName}, 1)`} />
      </div>
      <div class="right-part">
        <div class="title-brand-tagline">
          <span class="title">
            <TextPlaceholder width="20ch" height="1em" />
          </span>
        </div>
        <div class="price-container">
          {/*Duplicated in DefaultInstantCard*/}
          <TextPlaceholder width="5ch" height="1em" class="price" />
        </div>
      </div>
    </div>
  ) as HTMLDivElement;
}
