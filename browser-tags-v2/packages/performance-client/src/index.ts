/*! Depict PerformanceClient */
import { add_to_version_info } from "@depict-ai/utilishared";
import { version } from "./version";

export { PerformanceClient as DPC } from "./PerformanceClient";
export type { DepictQueue, DepictObject } from "./types";
export { version };

add_to_version_info("dpc", version);
