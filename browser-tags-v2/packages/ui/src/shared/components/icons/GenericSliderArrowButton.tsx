/** @jsxImportSource solid-js */

export function GenericSliderArrowButton(props: { width_?: number; height_?: number } = {}) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.width_ ?? 14} height={props.height_ ?? 26} viewBox="0 0 14 26">
      <path
        d="M2 24.656c-.078 0-.156-.016-.234-.047s-.133-.066-.187-.129c-.117-.117-.176-.258-.176-.422s.059-.305.176-.422l10.371-10.371L1.578 2.883c-.117-.117-.176-.258-.176-.422s.059-.305.176-.422.258-.176.422-.176.305.059.422.176l10.805 10.793a.59.59 0 0 1 .176.434c0 .172-.059.305-.176.422L2.422 24.48a.42.42 0 0 1-.199.129.54.54 0 0 1-.223.047zm0 0"
        fill="#0f0f0f"
      />
    </svg>
  ) as unknown as SVGElement;
}
