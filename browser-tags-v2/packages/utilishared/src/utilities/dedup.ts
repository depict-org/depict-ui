import { LegacyDisplay } from "../rendering/recommendation-renderer/types";

type CompareMethod<T> = (i1: T, i2: T) => boolean;

export const deduplicate = <T>(arr1: T[], arr2: T[], compareFunc: CompareMethod<T>): T[] => {
  return arr1.filter(e1 => arr2.every(e2 => !compareFunc(e1, e2)));
};

export const dedup_products = <T extends LegacyDisplay>(arr1: T[], arr2: T[] | undefined) =>
  deduplicate(arr1, arr2 || [], (i1, i2) => i1.product_id === i2.product_id);
