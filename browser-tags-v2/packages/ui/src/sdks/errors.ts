// Errors caused by SDK consuming code interfacing with the SDK, not the SDK itself or other Depict packages
export class SDKError extends Error {}
export class ProductCardError extends SDKError {
  constructor(templateError: Error) {
    super("Uncaught error in product card template", { cause: templateError });
  }
}
