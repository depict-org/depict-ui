// @ts-nocheck
import "../styles/globals.css";
import "../styles/depict.scss";
import "../styles/depict_custom.css";

import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
