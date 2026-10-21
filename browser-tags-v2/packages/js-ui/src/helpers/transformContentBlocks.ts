import { snakeCasifyObject } from "@depict-ai/utilishared";
import { JSUIContentBlocksByRow } from "../types";

export function transformContentBlocks(blocks: JSUIContentBlocksByRow | undefined) {
  return blocks?.map(block => block && snakeCasifyObject(block));
}
