/** @jsxImportSource solid-js */
import { JSX } from "solid-js";

export function PlusIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="11" height="12">
      <path
        d="M10.173 5.548H5.5V.875c0-.075-.027-.14-.081-.193S5.301.601 5.226.601s-.14.027-.193.081-.081.118-.081.193v4.673H.274c-.075 0-.14.027-.193.081A.27.27 0 0 0 0 5.827c0 .075.027.14.081.193s.118.081.193.081h4.678v4.673c0 .075.027.14.081.193s.118.081.193.081.14-.027.193-.081.081-.118.081-.193V6.101h4.673a.27.27 0 0 0 .199-.081c.054-.054.08-.118.08-.193a.27.27 0 0 0-.279-.279z"
        fill="#000"
      />
    </svg>
  );
}
