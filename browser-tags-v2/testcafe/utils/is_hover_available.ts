import { ClientFunction } from "testcafe";

export const is_hover_available = ClientFunction(() => window.matchMedia("(hover: hover)").matches);
