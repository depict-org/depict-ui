import { mount, StartClient } from "@solidjs/start/client";
import lightmode_css from "./styling/root-lightmode.scss?inline";
import darkmode_css from "./styling/root.scss?inline";
import { createRenderEffect, createRoot } from "solid-js";
import { darkmodeBlocked, osDark } from "~/helpers/darkmodeBlocked";

const style_tag = document.createElement("style");
const [getDarkModeBlocked] = darkmodeBlocked;

createRoot(() =>
  createRenderEffect(() => style_tag.replaceChildren(osDark() && !getDarkModeBlocked() ? darkmode_css : lightmode_css))
);

document.head.append(style_tag);

mount(() => <StartClient />, document.getElementById("app"));
