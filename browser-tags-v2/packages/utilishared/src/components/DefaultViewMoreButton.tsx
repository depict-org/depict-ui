import { JSX } from "solid-js";

type ButtonProps = Omit<Partial<JSX.IntrinsicElements["button"]>, "type"> & { class?: string };

export function DefaultViewMoreButton({ children, ...attributes }: ButtonProps): HTMLButtonElement {
  const button = (
    <button {...attributes} type="button">
      {children}
    </button>
  ) as HTMLButtonElement;
  button.classList.add("show-more");
  return button;
}
