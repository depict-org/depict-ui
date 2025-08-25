import { catchify } from "../logging/error";

export const expandingContainer = (
  { duration = 500 } = { duration: 500 }
): { expand: () => void; content: HTMLDivElement; container: HTMLDivElement } => {
  const container = document.createElement("div");
  container.style.overflow = "hidden";
  container.style.height = "0";
  container.style.transition = "height 0.5s";

  const content = document.createElement("div");

  container.append(content);

  const expand = () => {
    container.style.height = content.clientHeight + "px";
    setTimeout(
      catchify(() => {
        container.style.overflow = "unset";
        container.style.height = "auto";
      }),
      duration
    );
  };

  return { expand, content, container };
};
