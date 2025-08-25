import { JSX } from "solid-js";
import { catchify } from "../logging/error";

export { use_element, use_listener, classlist } from "./functions";

export type Props = {
  children?: Elem[] | Elem;
  onClick?: (e: MouseEvent) => void;
  [key: string]: any;
};
export type Elem = Node | string;
export type Component = (props: Props, _unknown?: unknown) => HTMLElement;

const appendChild = (parent: JSX.Element | DocumentFragment, child: Elem | Elem[] | undefined) => {
  if (!child) return; // null, undefined, false, "", etc should not create nodes

  if (!(child instanceof Node || typeof child === "string") && typeof child[Symbol.iterator] === "function") {
    if (child.length !== undefined) {
      // it's array-like enough to be iterated with a normal for loop (for-of is 20% of that speed)
      for (let i = 0; i < child.length; i++) appendChild(parent, child[i]);
    } else {
      // fallback for things only implementing iterator interface
      for (const more_kids of child) appendChild(parent, more_kids);
    }
    return;
  }

  (parent as Element).append(child as Elem);
};

export const jsx = (tag: string | Component, { children, ...props }: Props, _unknown?: unknown): JSX.Element => {
  if (typeof tag === "function") return tag({ children, ...props }, _unknown);

  // For partial SVG support
  // Exhaustive list (I think) for these checks should be ["svg","animate","animateMotion","animateTransform","circle","clipPath","defs","desc","ellipse","feBlend","feColorMatrix","feComponentTransfer","feComposite","feConvolveMatrix","feDiffuseLighting","feDisplacementMap","feDistantLight","feFlood","feFuncA","feFuncB","feFuncG","feFuncR","feGaussianBlur","feImage","feMerge","feMergeNode","feMorphology","feOffset","fePointLight","feSpecularLighting","feSpotLight","feTile","feTurbulence","filter","foreignObject","g","image","line","linearGradient","marker","mask","metadata","path","pattern","polygon","polyline","radialGradient","rect","stop","switch","symbol","text","textPath","tspan","use","view"]
  const is_svg =
    props?.xmlns ||
    tag == "defs" ||
    tag == "filter" ||
    tag == "fecolormatrix" ||
    tag == "g" ||
    tag == "circle" ||
    tag == "circle" ||
    tag == "svg" ||
    tag == "path" ||
    tag == "polygon";
  if (is_svg) {
    var namespace = props?.xmlns || "http://www.w3.org/2000/svg";
  }

  if (typeof document === "undefined") return {} as unknown as JSX.Element;
  const element = is_svg ? document.createElementNS(namespace, tag) : document.createElement(tag);

  for (const key in props) {
    const value = props[key];
    if (key === "onClick") {
      element.addEventListener("click", catchify(value));
    } else if (key.startsWith("xlink:")) {
      // https://stackoverflow.com/a/23142447
      // https://developer.mozilla.org/en-US/docs/Web/SVG/Namespaces_Crash_Course
      element.setAttributeNS("http://www.w3.org/1999/xlink", key, value);
    } else if (key == "xmlns" || key.startsWith("xmlns:")) {
      element.setAttributeNS("http://www.w3.org/2000/xmlns/", key, value);
    } else if (key.startsWith("xml:")) {
      element.setAttributeNS("http://www.w3.org/XML/1998/namespace", key, value);
      // also helped: https://stackoverflow.com/questions/52571125/setattributens-xmlns-of-svg-for-a-general-purpose-library
    } else {
      element.setAttribute(key, props[key]);
    }
  }
  appendChild(element, children);
  return element;
};

export const jsxs = jsx;

export const Fragment = ({ children }: { children: Elem[] | Elem }, _unknown?: unknown): DocumentFragment => {
  if (typeof document === "undefined") return {} as unknown as DocumentFragment;
  const df = document.createDocumentFragment();
  appendChild(df, children);
  return df;
};
