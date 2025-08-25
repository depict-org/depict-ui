// Minifiable and tree-shakable enum
// Why not use const enum? See https://gitlab.com/depict-ai/depict.ai/-/merge_requests/9223#note_1675965260

export const LISTING_ID = "listingId";
export const EXTERNAL_ID = "externalId";

export type IdType = typeof LISTING_ID | typeof EXTERNAL_ID;
