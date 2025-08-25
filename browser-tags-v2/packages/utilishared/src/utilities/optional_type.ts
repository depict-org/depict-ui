/**
 * Make parts of a type optional
 *
 * From: https://github.com/Microsoft/TypeScript/issues/25760#issuecomment-614417742
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>;
